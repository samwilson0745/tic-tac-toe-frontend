import React, { useState } from "react";

interface Props {
  onCreate: (roomName: string, turnDuration: number) => Promise<void>;
  onCancel: () => void;
}

const CreateRoomModal: React.FC<Props> = ({ onCreate, onCancel }) => {
  const [roomName, setRoomName] = useState("");
  const [turnDuration, setTurnDuration] = useState(30);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError("Room name is required");
      return;
    }
    setError("");
    setIsCreating(true);

    try {
      await onCreate(roomName.trim(), turnDuration);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create room");
      }
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <h2>Create Game Room</h2>
        <form onSubmit={handleSubmit} className="create-room-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="roomName">Room Name</label>
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Epic Battle"
              maxLength={30}
              autoFocus
              disabled={isCreating}
            />
          </div>

          <div className="form-group">
            <label>Turn Timer</label>
            <div className="duration-selector">
              {[15, 30, 60].map((duration) => (
                <button
                  type="button"
                  key={duration}
                  className={`btn-duration ${turnDuration === duration ? "active" : ""}`}
                  onClick={() => setTurnDuration(duration)}
                  disabled={isCreating}
                >
                  {duration}s
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || !roomName.trim()}
            >
              {isCreating ? "Creating..." : "Create Room 🎮"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
