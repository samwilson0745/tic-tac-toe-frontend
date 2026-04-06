import React, { useState, useEffect, useCallback } from "react";
import {
  nakama,
  type ConnectionState,
} from "./services/nakama";
import ConnectionStatus from "./components/ConnectionStatus";
import HomeScreen from "./components/HomeScreen";
import GameBoard from "./components/GameBoard";
import Leaderboard from "./components/Leaderboard";
import CreateRoomModal from "./components/CreateRoomModal";
import RoomBrowser from "./components/RoomBrowser";

type Screen = "home" | "game" | "leaderboard" | "rooms";

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [initError, setInitError] = useState("");

  // ── Initialize connection on mount ──
  useEffect(() => {
    const init = async () => {
      try {
        if (nakama.getConnectionState() !== "connected" || nakama.getConnectionState() !== "connecting") {
          await nakama.connect();
        }
      } catch (error) {
        console.error("Failed to initialize:", error);
        setInitError("Failed to connect to game server. Make sure Nakama is running.");
      }
    };

    init();

    const unsubConn = nakama.onConnectionChange((state) => {
      setConnectionState(state);
    });

    const unsubMatch = nakama.onMatchmakerMatched(() => {
      setIsMatchmaking(false);
      setScreen("game");
    });

    return () => {
      unsubConn();
      unsubMatch();
    };
  }, []);

  // ── Matchmaking ──
  const handleFindMatch = useCallback(async () => {
    try {
      setIsMatchmaking(true);
      await nakama.findMatch();
    } catch (error) {
      console.error("Failed to find match:", error);
      setIsMatchmaking(false);
    }
  }, []);

  const handleCancelMatchmaking = useCallback(async () => {
    try {
      await nakama.cancelMatchmaking();
    } catch (error) {
      console.error("Failed to cancel matchmaking:", error);
    } finally {
      setIsMatchmaking(false);
    }
  }, []);

  const handleBackToMenu = useCallback(() => {
    setScreen("home");
    setIsMatchmaking(false);
  }, []);

  const handleCreateRoom = async (roomName: string, turnDuration: number) => {
    await nakama.createRoom(roomName, turnDuration);
    setShowCreateRoom(false);
    setScreen("game");
  };

  // ── Render init error ──
  if (initError) {
    return (
      <div className="app-container">
        <div className="init-error glass-card" id="init-error">
          <h2>⚠️ Connection Error</h2>
          <p>{initError}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setInitError("");
              nakama.connect().catch((err) => {
                setInitError("Still unable to connect: " + err.message);
              });
            }}
          >
            Retry
          </button>
          <div className="init-error-help">
            <p>Make sure the Nakama server is running:</p>
            <code>docker-compose up</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" id="app">
      <ConnectionStatus state={connectionState} />

      {connectionState !== "connected" ? (
        <div className="browser-loading" style={{ height: "50vh", justifyContent: "center" }}>
          <div className="matchmaking-spinner"></div>
          <p>Connecting to game server...</p>
        </div>
      ) : (
        <>
          {screen === "home" && (
            <HomeScreen
              onFindMatch={handleFindMatch}
              onViewLeaderboard={() => setScreen("leaderboard")}
              isMatchmaking={isMatchmaking}
              onCancelMatchmaking={handleCancelMatchmaking}
              onCreateRoom={() => setShowCreateRoom(true)}
              onBrowseRooms={() => setScreen("rooms")}
            />
          )}

          {showCreateRoom && (
            <CreateRoomModal
              onCreate={handleCreateRoom}
              onCancel={() => setShowCreateRoom(false)}
            />
          )}

          {screen === "rooms" && (
            <RoomBrowser
              onBack={() => setScreen("home")}
              onRoomJoined={() => setScreen("game")}
            />
          )}

          {screen === "game" && (
            <GameBoard onBackToMenu={handleBackToMenu} />
          )}

          {screen === "leaderboard" && (
            <Leaderboard onBack={() => setScreen("home")} />
          )}
        </>
      )}
    </div>
  );
};

export default App;
