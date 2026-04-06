import React from "react";
import type { ConnectionState } from "../services/nakama";

interface Props {
  state: ConnectionState;
}

const ConnectionStatus: React.FC<Props> = ({ state }) => {
  const config: Record<ConnectionState, { label: string; className: string; icon: string }> = {
    connected: { label: "Connected", className: "status-connected", icon: "●" },
    connecting: { label: "Connecting...", className: "status-connecting", icon: "◌" },
    disconnected: { label: "Disconnected", className: "status-disconnected", icon: "○" },
    error: { label: "Connection Error", className: "status-error", icon: "✕" },
  };

  const { label, className, icon } = config[state];

  return (
    <div className={`connection-status ${className}`} id="connection-status">
      <span className="status-icon">{icon}</span>
      <span className="status-label">{label}</span>
    </div>
  );
};

export default ConnectionStatus;
