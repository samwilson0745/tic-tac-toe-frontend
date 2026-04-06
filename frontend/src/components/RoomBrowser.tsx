import React, { useState, useEffect, useCallback } from "react";
import { nakama, type RoomListEntry } from "../services/nakama";

interface Props {
  onBack: () => void;
  onRoomJoined: () => void;
}

const RoomBrowser: React.FC<Props> = ({ onBack, onRoomJoined }) => {
  const [rooms, setRooms] = useState<RoomListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setError("");
      const list = await nakama.listRooms();
      setRooms(list);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch rooms");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleJoin = async (matchId: string) => {
    try {
      setJoiningRoomId(matchId);
      setError("");
      await nakama.joinMatch(matchId);
      onRoomJoined();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to join room. It might be full.");
      }
      setJoiningRoomId(null);
      fetchRooms(); // refresh the list
    }
  };

  const getTimeAgo = (createdAtSeconds: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - createdAtSeconds;
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    return `${mins}m ago`;
  };

  return (
    <div className="room-browser-screen">
      <div className="browser-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h2 className="browser-title">Browse Rooms</h2>
        <button
          className={`btn-refresh ${isLoading ? "spinning" : ""}`}
          onClick={fetchRooms}
          disabled={isLoading}
          title="Refresh rooms"
        >
          🔄
        </button>
      </div>

      {error && <div className="browser-error">{error}</div>}

      <div className="room-list">
        {isLoading && rooms.length === 0 ? (
          <div className="browser-loading">
            <div className="matchmaking-spinner"></div>
            <p>Scanning for rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="browser-empty glass-card">
            <p>No open rooms found.</p>
            <p className="browser-suggestion">Create your own room and invite a friend!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.matchId} className="room-card glass-card">
              <div className="room-info">
                <div className="room-header">
                  <span className="room-icon">🎮</span>
                  <h3 className="room-name">{room.roomName}</h3>
                </div>
                <div className="room-details">
                  <span className="room-creator">by {room.creatorUsername}</span>
                  <span className="room-dot">•</span>
                  <span className="room-players">{room.playerCount}/2 Players</span>
                  <span className="room-dot">•</span>
                  <span className="room-timer">{room.turnDuration}s turn</span>
                </div>
                <div className="room-time">{getTimeAgo(room.createdAt)}</div>
              </div>
              <button
                className="btn btn-primary btn-join"
                onClick={() => handleJoin(room.matchId)}
                disabled={joiningRoomId !== null || room.playerCount >= 2}
              >
                {joiningRoomId === room.matchId ? "Joining..." : "Join"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RoomBrowser;
