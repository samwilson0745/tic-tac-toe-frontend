import React, { useState, useEffect, useCallback } from "react";
import { nakama, OpCode } from "../services/nakama";
import type {
  MatchStatePayload,
  MoveConfirmedPayload,
  GameOverPayload,
  OpponentJoinedPayload,
  ErrorPayload,
} from "../services/nakama";

interface Props {
  onBackToMenu: () => void;
}

const GameBoard: React.FC<Props> = ({ onBackToMenu }) => {
  const [board, setBoard] = useState<(number | null)[]>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<string>("");
  const [phase, setPhase] = useState<"waiting" | "playing" | "finished">("waiting");
  const [players, setPlayers] = useState<Record<string, { username: string; mark: number }>>({});
  const [winner, setWinner] = useState<string>("");
  const [winnerUsername, setWinnerUsername] = useState<string>("");
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [isDraw, setIsDraw] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [turnDeadline, setTurnDeadline] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  const userId = nakama.getUserId();

  // ── Handle match data from server ──
  const handleMatchData = useCallback(
    (opCode: number, data: unknown) => {
      switch (opCode) {
        case OpCode.MATCH_STATE: {
          const state = data as MatchStatePayload;
          setBoard(state.board);
          setCurrentTurn(state.currentTurn);
          setPhase(state.phase);
          setPlayers(state.players);
          setTurnDeadline(state.turnDeadline);
          break;
        }
        case OpCode.MOVE_CONFIRMED: {
          const move = data as MoveConfirmedPayload;
          setBoard(move.board);
          setCurrentTurn(move.nextTurn);
          setLastMove(move.position);
          break;
        }
        case OpCode.GAME_OVER: {
          const result = data as GameOverPayload;
          setBoard(result.board);
          setWinner(result.winner);
          setWinnerUsername(result.winnerUsername);
          setWinningLine(result.winningLine || []);
          setIsDraw(result.isDraw);
          setEndReason(result.reason);
          setPhase("finished");
          break;
        }
        case OpCode.OPPONENT_JOINED: {
          const joined = data as OpponentJoinedPayload;
          setPlayers((prev) => ({
            ...prev,
            [joined.userId]: { username: joined.username, mark: joined.mark },
          }));
          setOpponentDisconnected(false);
          break;
        }
        case OpCode.OPPONENT_LEFT: {
          setOpponentDisconnected(true);
          break;
        }
        case OpCode.TURN_TIMER: {
          const timer = data as { deadline: number };
          setTurnDeadline(timer.deadline);
          break;
        }
        case OpCode.ERROR: {
          const err = data as ErrorPayload;
          setErrorMessage(err.message);
          setTimeout(() => setErrorMessage(""), 3000);
          break;
        }
      }
    },
    []
  );

  useEffect(() => {
    const unsub = nakama.onMatchData(handleMatchData);

    // If we missed the initial MATCH_STATE packet during component mount, load it now
    const initialState = nakama.getInitialMatchState();
    if (initialState) {
      handleMatchData(OpCode.MATCH_STATE, initialState);
    }

    return () => unsub();
  }, [handleMatchData]);

  // ── Turn timer countdown ──
  useEffect(() => {
    if (phase !== "playing" || !turnDeadline) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, turnDeadline - now);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [turnDeadline, phase]);

  // ── Handle cell click ──
  const handleCellClick = (position: number) => {
    console.log(position)
    if (phase !== "playing") return;
    if (currentTurn !== userId) return;
    if (board[position] !== null) return;

    nakama.sendMove(position);
  };

  // ── Leave match ──
  const handleLeave = async () => {
    await nakama.leaveMatch();
    nakama.resetMatch();
    onBackToMenu();
  };

  // ── Render helpers ──
  const isMyTurn = currentTurn === userId;
  const myMark = players[userId]?.mark;
  const myMarkChar = myMark === 0 ? "X" : "O";

  const opponentId = Object.keys(players).find((id) => id !== userId);
  const opponentUsername = opponentId ? players[opponentId]?.username : "Waiting...";

  const getResultMessage = (): string => {
    if (isDraw) return "It's a Draw!";
    if (winner === userId) return "You Win! 🎉";
    if (winnerUsername) return `You Lose 😔 (${winnerUsername} won)`;
    return "You Lose 😔";
  };

  const getResultClass = (): string => {
    if (isDraw) return "result-draw";
    if (winner === userId) return "result-win";
    return "result-loss";
  };

  const getReasonText = (): string => {
    switch (endReason) {
      case "timeout": return "Opponent timed out";
      case "turn_timeout": return "Turn timer expired";
      case "forfeit": return "Opponent forfeited";
      default: return "";
    }
  };

  const renderMark = (cell: number | null, index: number) => {
    if (cell === null) return null;
    const markChar = cell === 0 ? "X" : "O";
    return (
      <span
        className={`mark mark-${markChar.toLowerCase()} ${lastMove === index ? "mark-new" : ""
          }`}
      >
        {markChar}
      </span>
    );
  };

  return (
    <div className="game-container" id="game-container">
      {/* Player info bar */}
      <div className="players-bar" id="players-bar">
        <div className={`player-card ${isMyTurn && phase === "playing" ? "active-turn" : ""}`}>
          <span className={`player-mark mark-${myMarkChar.toLowerCase()}`}>
            {myMarkChar}
          </span>
          <span className="player-name">You</span>
          {isMyTurn && phase === "playing" && <span className="turn-indicator">Your turn</span>}
        </div>
        <div className="vs-divider">
          {phase === "playing" && (
            <div className={`timer ${timeLeft <= 5 ? "timer-danger" : timeLeft <= 10 ? "timer-warning" : ""}`}>
              {timeLeft}s
            </div>
          )}
          {phase === "waiting" && <span className="waiting-text">Waiting...</span>}
          {phase === "finished" && <span className="finished-text">Game Over</span>}
        </div>
        <div className={`player-card ${!isMyTurn && phase === "playing" ? "active-turn" : ""} ${opponentDisconnected ? "disconnected" : ""}`}>
          <span className={`player-mark mark-${myMarkChar === "X" ? "o" : "x"}`}>
            {myMarkChar === "X" ? "O" : "X"}
          </span>
          <span className="player-name">{opponentUsername}</span>
          {!isMyTurn && phase === "playing" && !opponentDisconnected && (
            <span className="turn-indicator">Their turn</span>
          )}
          {opponentDisconnected && <span className="disconnected-badge">Disconnected</span>}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="error-toast" id="error-toast">
          {errorMessage}
        </div>
      )}

      {/* Game board */}
      <div className={`board ${phase === "finished" ? "board-finished" : ""} ${phase === "waiting" ? "board-waiting" : ""}`} id="game-board">
        {board.map((cell, index) => (
          <button
            key={index}
            id={`cell-${index}`}
            className={`cell ${cell !== null ? "cell-filled" : ""
              } ${winningLine.includes(index) ? "cell-winning" : ""
              } ${cell === null && isMyTurn && phase === "playing" ? "cell-clickable" : ""
              } ${lastMove === index ? "cell-last-move" : ""
              }`}
            onClick={() => handleCellClick(index)}
            disabled={phase !== "playing" || !isMyTurn || cell !== null}
            aria-label={`Cell ${index}: ${cell === null ? "empty" : cell === 0 ? "X" : "O"}`}
          >
            {renderMark(cell, index)}
          </button>
        ))}
      </div>

      {/* Game result overlay */}
      {phase === "finished" && (
        <div className={`result-overlay ${getResultClass()}`} id="game-result">
          <h2 className="result-text">{getResultMessage()}</h2>
          {getReasonText() && <p className="result-reason">{getReasonText()}</p>}
          <div className="result-actions">
            <button className="btn btn-primary" onClick={handleLeave} id="btn-play-again">
              Play Again
            </button>
            <button className="btn btn-secondary" onClick={handleLeave} id="btn-back-menu">
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Waiting overlay */}
      {phase === "waiting" && (
        <div className="waiting-overlay" id="waiting-overlay">
          <div className="waiting-spinner" />
          <p>Waiting for opponent...</p>
        </div>
      )}

      {/* Leave button */}
      {phase !== "finished" && (
        <button className="btn btn-leave" onClick={handleLeave} id="btn-leave-match">
          Leave Match
        </button>
      )}
    </div>
  );
};

export default GameBoard;
