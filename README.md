# Tic-Tac-Toe Frontend

A modern, responsive React-based frontend for the multiplayer Tic-Tac-Toe game, powered by the [Nakama JS Client](https://heroiclabs.com/docs/javascript-client-guide/).

## Features

- **Multiplayer Lobby**: Dynamic room listing and searching for active matches.
- **Real-Time Gameplay**: Seamless, low-latency move updates using Nakama's WebSockets.
- **Beautiful UI**: Modern, glassmorphic design and smooth animations for a premium feel.
- **Interactive States**: Loading indicators, victory/loss screens, and matchmaking status.
- **Persisted Ranking**: Global leaderboard visible from the main menu.
- **Player Profiles**: Custom usernames and simple authentication.

## Tech Stack

- **React**: Component-based UI library.
- **Vite**: Ultra-fast build tool and dev server.
- **TypeScript**: Type-safe development for complex state management.
- **Vanilla CSS**: Custom styling for maximum design control.
- **Nakama JS SDK**: Communication with the Nakama server.

## Project Structure

```text
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Board.tsx     # Tic-Tac-Toe grid
│   │   ├── Lobby.tsx     # Matchmaking and room discovery
│   │   ├── Leaderboard.tsx # Ranking display
│   │   └── HomeScreen.tsx # Start screen
│   ├── services/
│   │   └── nakama.ts     # Wrapper for the Nakama client and socket
│   ├── App.tsx           # Global state and routing
│   └── index.css         # Global styles
├── public/               # Static assets
└── vite.config.ts        # Vite configuration
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- Ensure the **Nakama Backend** is running (see `nakama/README.md`)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:5173/](http://localhost:5173/).

## Features Overview

### Matchmaking
The app allows players to browse open matches or create public/private rooms. Once two players join, the game starts automatically on the server.

### Gameplay
Players interact with a 3x3 grid. Every move is sent to the Nakama server for validation. The server then pushes the updated game state back to both players via WebSockets.

### Leaderboard
Scores are calculated by the server and fetched on the home screen to show top-performing players globally.

## License

This project is for educational purposes.
