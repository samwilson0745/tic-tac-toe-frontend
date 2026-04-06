/**
 * Nakama client service — singleton managing connection to Nakama server.
 *
 * Handles authentication, socket connection, matchmaking, and
 * real-time game communication. This is the ONLY interface between
 * the frontend and the Nakama backend.
 */

import { Client, Session } from "@heroiclabs/nakama-js";
import type { Socket, MatchData, MatchmakerMatched } from "@heroiclabs/nakama-js";

// ── Configuration ──────────────────────────────────────────────────────

const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const NAKAMA_KEY = import.meta.env.VITE_NAKAMA_KEY || "defaultkey";
const NAKAMA_USE_SSL = import.meta.env.VITE_NAKAMA_SSL === "true";

// ── OpCodes (must match server) ────────────────────────────────────────

export const OpCode = {
  MATCH_STATE: 1,
  MAKE_MOVE: 2,
  MOVE_CONFIRMED: 3,
  GAME_OVER: 4,
  OPPONENT_JOINED: 5,
  OPPONENT_LEFT: 6,
  ERROR: 7,
  TURN_TIMER: 8,
} as const;

// ── Types ──────────────────────────────────────────────────────────────

export interface MatchStatePayload {
  board: (number | null)[];
  currentTurn: string;
  phase: "waiting" | "playing" | "finished";
  players: Record<string, { username: string; mark: number }>;
  turnDeadline: number;
  turnDurationSec: number;
}

export interface MoveConfirmedPayload {
  position: number;
  mark: number;
  nextTurn: string;
  board: (number | null)[];
}

export interface GameOverPayload {
  winner: string;
  winnerUsername: string;
  winningLine: number[];
  reason: string;
  board: (number | null)[];
  isDraw: boolean;
}

export interface OpponentJoinedPayload {
  userId: string;
  username: string;
  mark: number;
}

export interface OpponentLeftPayload {
  userId: string;
  reason: string;
}

export interface ErrorPayload {
  message: string;
}

export interface LeaderboardRecord {
  userId: string;
  username: string;
  score: number;
  subscore: number;
  rank: number;
  metadata: {
    wins?: number;
    losses?: number;
    draws?: number;
    streak?: number;
  };
  updateTime: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  totalGames: number;
  rank: number;
  winRate: number;
}

export interface RoomListEntry {
  matchId: string;
  roomName: string;
  creatorUsername: string;
  playerCount: number;
  turnDuration: number;
  createdAt: number;
}

export interface CreateRoomResponse {
  matchId: string;
  roomName: string;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

// ── Callbacks ──────────────────────────────────────────────────────────

type MatchDataCallback = (opCode: number, data: unknown) => void;
type ConnectionCallback = (state: ConnectionState) => void;
type MatchmakerCallback = () => void;

// ── Singleton Service ──────────────────────────────────────────────────

class NakamaService {
  private client: Client | null = null;
  private session: Session | null = null;
  private socket: Socket | null = null;
  private currentMatchId: string | null = null;
  private matchTicket: string | null = null;
  private lastMatchState: unknown | null = null;

  private matchDataCallbacks: MatchDataCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private matchmakerCallbacks: MatchmakerCallback[] = [];
  private connectionState: ConnectionState = "disconnected";

  // ── Initialization & Authentication ──

  async connect(): Promise<void> {
    try {
      this.setConnectionState("connecting");

      // Create client
      this.client = new Client(NAKAMA_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_USE_SSL);

      // Device auth — get or create device ID
      let deviceId = localStorage.getItem("ttt_device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("ttt_device_id", deviceId);
      }

      // Check for existing session
      const savedToken = localStorage.getItem("ttt_session_token");
      const savedRefreshToken = localStorage.getItem("ttt_refresh_token");

      if (savedToken && savedRefreshToken) {
        const restoredSession = Session.restore(savedToken, savedRefreshToken);
        if (!restoredSession.isexpired(Date.now() / 1000)) {
          this.session = restoredSession;
        } else if (!restoredSession.isrefreshexpired(Date.now() / 1000)) {
          try {
            this.session = await this.client.sessionRefresh(restoredSession);
            this.persistSession();
          } catch {
            this.session = null;
          }
        }
      }

      // Authenticate if no valid session
      if (!this.session) {
        this.session = await this.client.authenticateDevice(deviceId, true, deviceId.substring(0, 8));
        this.persistSession();
      }

      // Create and connect socket
      this.socket = this.client.createSocket(NAKAMA_USE_SSL, false);
      await this.socket.connect(this.session, true);

      // Register socket event handlers
      this.setupSocketHandlers();
      this.setConnectionState("connected");

    } catch (error) {
      console.error("Failed to connect to Nakama:", error);
      this.setConnectionState("error");
      throw error;
    }
  }

  private persistSession(): void {
    if (this.session) {
      localStorage.setItem("ttt_session_token", this.session.token);
      localStorage.setItem("ttt_refresh_token", this.session.refresh_token);
    }
  }

  async updateUsername(username: string): Promise<void> {
    if (!this.client || !this.session) throw new Error("Not connected");
    
    try {
      // 1. Update the account on backend
      await this.client.updateAccount(this.session, { username });
      
      // 2. The old cached JWT token still contains the old username payload.
      // Instead of doing a session refresh which may not rewrite claims immediately,
      // we forcibly re-authenticate the device to pull a completely fresh JWT.
      const deviceId = localStorage.getItem("ttt_device_id");
      if (deviceId) {
        this.session = await this.client.authenticateDevice(deviceId, true);
        this.persistSession();
      }
    } catch (e: any) {
      // If the token is orphaned (db wiped), wipe local storage and throw
      if (e.message && (e.message.includes("Resource not found") || e.status === 401 || e.status === 404 || e.status === 5)) {
        localStorage.removeItem("ttt_session_token");
        localStorage.removeItem("ttt_refresh_token");
        window.location.reload();
      }
      throw e;
    }
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.ondisconnect = () => {
      console.warn("Socket disconnected");
      this.setConnectionState("disconnected");
    };

    this.socket.onmatchdata = (matchData: MatchData) => {
      let data: unknown;
      try {
        // Nakama sends data as Uint8Array or string
        if (matchData.data) {
          if (typeof matchData.data === "string") {
            data = JSON.parse(matchData.data);
          } else if (matchData.data instanceof Uint8Array) {
            const text = new TextDecoder().decode(matchData.data);
            data = JSON.parse(text);
          } else {
            data = matchData.data;
          }
        }
      } catch {
        data = matchData.data;
      }

      if (matchData.op_code === OpCode.MATCH_STATE) {
        this.lastMatchState = data;
      }

      this.matchDataCallbacks.forEach((cb) => cb(matchData.op_code, data));
    };

    this.socket.onmatchmakermatched = async (matched: MatchmakerMatched) => {
      console.log("Matchmaker found a match!", matched);
      this.matchTicket = null;
      this.matchmakerCallbacks.forEach((cb) => cb());

      if (matched.match_id) {
        // Authoritative match created by server — join it directly
        await this.joinMatch(matched.match_id);
      } else if (matched.token) {
        // Join via matchmaker token
        try {
          const match = await this.socket!.joinMatch(undefined, matched.token);
          this.currentMatchId = match.match_id;
          console.log("Joined match via token:", this.currentMatchId);
        } catch (error) {
          console.error("Failed to join match via token:", error);
        }
      }
    };
  }

  // ── Match Management ──

  async createRoom(roomName: string, turnDuration?: number): Promise<{ matchId: string }> {
    if (!this.client || !this.session) throw new Error("Not connected");

    const result = await this.client.rpc(
      this.session,
      "create_room",
      { roomName, turnDuration }
    );

    if (result.payload) {
      const response = typeof result.payload === "string"
        ? JSON.parse(result.payload) as CreateRoomResponse
        : result.payload as CreateRoomResponse;

      if ((response as any).error) {
        throw new Error((response as any).error);
      }

      await this.joinMatch(response.matchId);
      return { matchId: response.matchId };
    }

    throw new Error("Failed to create room: empty response");
  }

  async listRooms(): Promise<RoomListEntry[]> {
    if (!this.client || !this.session) throw new Error("Not connected");

    const result = await this.client.rpc(
      this.session,
      "list_rooms",
      {}
    );

    if (result.payload) {
      const parsed = typeof result.payload === "string"
        ? JSON.parse(result.payload)
        : result.payload;
      return parsed.rooms || [];
    }
    
    return [];
  }

  async findMatch(): Promise<void> {
    if (!this.socket) throw new Error("Not connected");

    const ticket = await this.socket.addMatchmaker(
      "*",    // Query: match with anyone
      2,      // Min players
      2,      // Max players
      { mode: "standard" },  // String properties
      {}       // Numeric properties
    );

    this.matchTicket = ticket.ticket;
    console.log("Added to matchmaker, ticket:", this.matchTicket);
  }

  async cancelMatchmaking(): Promise<void> {
    if (!this.socket || !this.matchTicket) return;

    await this.socket.removeMatchmaker(this.matchTicket);
    this.matchTicket = null;
    console.log("Removed from matchmaker");
  }

  async joinMatch(matchId: string): Promise<void> {
    if (!this.socket) throw new Error("Not connected");

    const match = await this.socket.joinMatch(matchId);
    this.currentMatchId = match.match_id;
    console.log("Joined match:", this.currentMatchId);
  }

  async leaveMatch(): Promise<void> {
    if (!this.socket || !this.currentMatchId) return;

    await this.socket.leaveMatch(this.currentMatchId);
    this.currentMatchId = null;
    this.lastMatchState = null;
    console.log("Left match");
  }

  sendMove(position: number): void {
    if (!this.socket || !this.currentMatchId) {
      console.error("Cannot send move: not in a match");
      return;
    }

    this.socket.sendMatchState(
      this.currentMatchId,
      OpCode.MAKE_MOVE,
      JSON.stringify({ position })
    );
  }

  // ── Leaderboard & Stats ──

  async getLeaderboard(limit = 20): Promise<LeaderboardRecord[]> {
    if (!this.client || !this.session) throw new Error("Not connected");

    const result = await this.client.rpc(
      this.session,
      "get_leaderboard",
      { limit }
    );

    if (result.payload) {
      const parsed = typeof result.payload === "string"
        ? JSON.parse(result.payload)
        : result.payload;
      return parsed.records || [];
    }
    return [];
  }

  async getPlayerStats(): Promise<PlayerStats> {
    if (!this.client || !this.session) throw new Error("Not connected");

    const result = await this.client.rpc(
      this.session,
      "get_player_stats",
      {}
    );

    if (result.payload) {
      return typeof result.payload === "string"
        ? JSON.parse(result.payload)
        : result.payload as PlayerStats;
    }
    return {
      wins: 0, losses: 0, draws: 0, currentStreak: 0,
      bestStreak: 0, totalGames: 0, rank: 0, winRate: 0,
    };
  }

  // ── Event Subscriptions ──

  onMatchData(callback: MatchDataCallback): () => void {
    this.matchDataCallbacks.push(callback);
    return () => {
      this.matchDataCallbacks = this.matchDataCallbacks.filter((cb) => cb !== callback);
    };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    // Immediately notify of current state
    callback(this.connectionState);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter((cb) => cb !== callback);
    };
  }

  onMatchmakerMatched(callback: MatchmakerCallback): () => void {
    this.matchmakerCallbacks.push(callback);
    return () => {
      this.matchmakerCallbacks = this.matchmakerCallbacks.filter((cb) => cb !== callback);
    };
  }

  // ── Getters ──

  getUserId(): string {
    return this.session?.user_id || "";
  }

  getUsername(): string {
    return this.session?.username || "";
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getCurrentMatchId(): string | null {
    return this.currentMatchId;
  }

  getInitialMatchState(): unknown | null {
    return this.lastMatchState;
  }

  isMatchmaking(): boolean {
    return this.matchTicket !== null;
  }

  // ── Private Helpers ──

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionCallbacks.forEach((cb) => cb(state));
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect(true);
    }
    this.socket = null;
    this.session = null;
    this.currentMatchId = null;
    this.matchTicket = null;
    this.lastMatchState = null;
    this.setConnectionState("disconnected");
  }

  resetMatch(): void {
    this.currentMatchId = null;
    this.matchTicket = null;
    this.lastMatchState = null;
  }
}

// Export singleton instance
export const nakama = new NakamaService();
