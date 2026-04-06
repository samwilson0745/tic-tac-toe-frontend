import React, { useState, useEffect } from "react";
import { nakama, type PlayerStats } from "../services/nakama";

interface Props {
  onFindMatch: () => void;
  onViewLeaderboard: () => void;
  isMatchmaking: boolean;
  onCancelMatchmaking: () => void;
  onCreateRoom: () => void;
  onBrowseRooms: () => void;
}

const HomeScreen: React.FC<Props> = ({
  onFindMatch,
  onViewLeaderboard,
  isMatchmaking,
  onCancelMatchmaking,
  onCreateRoom,
  onBrowseRooms,
}) => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [username, setUsername] = useState(nakama.getUsername());

  useEffect(() => {
    loadStats();

    // Prompts users to select a custom name if they hold the default Nakama device ID sequence
    const deviceId = localStorage.getItem("ttt_device_id");
    if (deviceId && username === deviceId.substring(0, 8)) {
      setIsEditingName(true);
      setNewName("");
    }
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const playerStats = await nakama.getPlayerStats();
      setStats(playerStats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === username) {
      setIsEditingName(false);
      return;
    }

    // Nakama strict username validation
    const validUsernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9._]*[a-zA-Z0-9]$/;
    if (!validUsernameRegex.test(trimmed)) {
      alert("Username can only contain letters, numbers, underscores, and dots. It cannot start or end with a special character or contain spaces.");
      return;
    }

    try {
      setIsSavingName(true);
      await nakama.updateUsername(trimmed);
      setUsername(trimmed);
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update username:", error);
      alert("Failed to update username. It might be already taken.");
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="home-screen" id="home-screen">
      <div className="home-header">
        <h1 className="game-title" id="game-title">
          <span className="title-x">X</span>
          <span className="title-o">O</span>
          <span className="title-x">X</span>
          <span className="title-sep">—</span>
          <span className="title-text">Arena</span>
        </h1>
        <p className="game-subtitle">Server-Authoritative Multiplayer</p>
      </div>

      {/* Player card */}
      <div className="player-stats-card glass-card" id="player-stats-card">
        <div className="stats-header">
          <div className="avatar-circle">{username.charAt(0).toUpperCase()}</div>
          <div className="player-details" style={{ flex: 1, position: "relative" }}>
            {isEditingName ? (
              <div className="name-edit-form" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSavingName}
                  autoFocus
                  maxLength={20}
                  className="name-edit-input"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid var(--border-subtle)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    width: "150px"
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-primary)" }}
                  title="Save Name"
                >
                  ✓
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 className="player-username">{username}</h3>
                <button
                  onClick={() => {
                    setNewName(username);
                    setIsEditingName(true);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.7, padding: 0 }}
                  title="Edit Name"
                >
                  ✏️
                </button>
              </div>
            )}

            {stats && stats.rank > 0 && !isEditingName && (
              <span className="player-rank">Rank #{stats.rank}</span>
            )}
          </div>
        </div>

        {loadingStats ? (
          <div className="stats-loading">Loading stats...</div>
        ) : stats && stats.totalGames > 0 ? (
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value stat-wins">{stats.wins}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat-item">
              <span className="stat-value stat-losses">{stats.losses}</span>
              <span className="stat-label">Losses</span>
            </div>
            <div className="stat-item">
              <span className="stat-value stat-draws">{stats.draws}</span>
              <span className="stat-label">Draws</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.winRate}%</span>
              <span className="stat-label">Win Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-value stat-streak">{stats.bestStreak}</span>
              <span className="stat-label">Best Streak</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalGames}</span>
              <span className="stat-label">Total Games</span>
            </div>
          </div>
        ) : (
          <p className="stats-empty">No games played yet. Find a match!</p>
        )}
      </div>

      {/* Actions */}
      <div className="home-actions">
        {isMatchmaking ? (
          <div className="matchmaking-active" id="matchmaking-status">
            <div className="matchmaking-spinner" />
            <p className="matchmaking-text">Finding opponent...</p>
            <button
              className="btn btn-cancel"
              onClick={onCancelMatchmaking}
              id="btn-cancel-matchmaking"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              className="btn btn-primary btn-large"
              onClick={onFindMatch}
              id="btn-find-match"
            >
              <span className="btn-icon">⚔️</span>
              Quick Match
            </button>
            <button
              className="btn btn-secondary btn-large"
              onClick={onCreateRoom}
              id="btn-create-room"
            >
              <span className="btn-icon">🎮</span>
              Create Room
            </button>
            <button
              className="btn btn-secondary btn-large"
              onClick={onBrowseRooms}
              id="btn-browse-rooms"
            >
              <span className="btn-icon">🔍</span>
              Browse Rooms
            </button>
          </>
        )}

        <button
          className="btn btn-secondary"
          onClick={onViewLeaderboard}
          id="btn-leaderboard"
          disabled={isMatchmaking}
        >
          <span className="btn-icon">🏆</span>
          Leaderboard
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;
