import React, { useState, useEffect } from "react";
import { nakama, type LeaderboardRecord } from "../services/nakama";

interface Props {
  onBack: () => void;
}

const Leaderboard: React.FC<Props> = ({ onBack }) => {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = nakama.getUserId();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await nakama.getLeaderboard(20);
      setRecords(data);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="leaderboard-screen" id="leaderboard-screen">
      <div className="leaderboard-header">
        <button className="btn btn-back" onClick={onBack} id="btn-back-home">
          ← Back
        </button>
        <h2 className="leaderboard-title">🏆 Leaderboard</h2>
        <button className="btn btn-refresh" onClick={loadLeaderboard} id="btn-refresh-leaderboard">
          ↻
        </button>
      </div>

      {loading && (
        <div className="leaderboard-loading">
          <div className="matchmaking-spinner" />
          <p>Loading rankings...</p>
        </div>
      )}

      {error && <div className="leaderboard-error">{error}</div>}

      {!loading && !error && records.length === 0 && (
        <div className="leaderboard-empty">
          <p>No rankings yet. Be the first to play!</p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="leaderboard-table-wrapper glass-card">
          <table className="leaderboard-table" id="leaderboard-table">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th className="col-player">Player</th>
                <th className="col-wins">W</th>
                <th className="col-losses">L</th>
                <th className="col-draws">D</th>
                <th className="col-score">Score</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr
                  key={record.userId}
                  className={`leaderboard-row ${
                    record.userId === userId ? "my-rank" : ""
                  } ${index < 3 ? "top-rank" : ""}`}
                  id={`rank-${record.rank}`}
                >
                  <td className="col-rank">
                    <span className={`rank-badge rank-${index < 3 ? index + 1 : "default"}`}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : record.rank}
                    </span>
                  </td>
                  <td className="col-player">
                    <span className="player-entry-name">
                      {record.username}
                      {record.userId === userId && (
                        <span className="you-badge">You</span>
                      )}
                    </span>
                  </td>
                  <td className="col-wins">{record.metadata?.wins ?? 0}</td>
                  <td className="col-losses">{record.metadata?.losses ?? 0}</td>
                  <td className="col-draws">{record.metadata?.draws ?? 0}</td>
                  <td className="col-score">
                    <span className="score-value">{record.score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
