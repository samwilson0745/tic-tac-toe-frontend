# Tic-Tac-Toe Frontend

A modern, responsive React-based frontend for the multiplayer Tic-Tac-Toe game, powered by the [Nakama JS Client](https://heroiclabs.com/docs/javascript-client-guide/).

**Live Demo:** [https://tic-tac-toe-frtnd.netlify.app/](https://tic-tac-toe-frtnd.netlify.app/)

## Features

- **Multiplayer Lobby**: Dynamic room listing and searching for active matches.
- **Matchmaking**: Join a global queue to be automatically paired with an opponent.
- **Real-Time Gameplay**: Seamless, low-latency move updates using Nakama's WebSockets.
- **Beautiful UI**: Modern, glassmorphic design and smooth animations for a premium feel.
- **Interactive States**: Loading indicators, victory/loss screens, and matchmaking status.
- **Global Leaderboard**: Track your performance against other players.
- **Player Profiles**: Custom usernames and persistent player statistics.

## Tech Stack

- **React**: Component-based UI library.
- **Vite**: Ultra-fast build tool and dev server.
- **TypeScript**: Type-safe development for complex state management.
- **Vanilla CSS**: Custom styling for maximum design control.
- **Nakama JS SDK**: Communication with the Nakama server.

---

## Architecture and Design Decisions

### 1. Server-Authoritative Logic
The frontend is designed to be a "dumb" client. Match logic (validating moves, determining winners, managing turns) is handled entirely by the Nakama backend. This ensures a secure, cheat-proof environment where the client only renders what the server dictates.

### 2. Singleton Service Pattern
The `nakama.ts` file implements a singleton service called `NakamaService`. This encapsulates:
- Authentication (Device and Session management)
- Socket lifecycle and event handling
- RPC calls for room management and leaderboard fetching
- Match synchronization

### 3. Real-Time State Sync
The game uses Nakama's **Match State** system. Every move is sent as an "OpCode", and the server broadcasts a full state update back to all participants, ensuring perfect synchronization across different devices and latencies.

### 4. Glassmorphic UI
The styling follows modern "Glassmorphism" principles—using backdrops, subtle blurs, and vibrant gradients to create a high-end, premium gaming interface without the overhead of heavy CSS frameworks.

---

## Setup and Installation

### Prerequisites

- **Node.js**: Version 20+ recommended.
- **Nakama Backend**: You MUST have a running Nakama server instance. Refer to the [tic-tac-toe-backend](https://github.com/samwilson0745/tic-tac-toe-backend) repository for setup instructions.

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/samwilson0745/tic-tac-toe-frontend.git
   cd tic-tac-toe-frontend/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

The application will be available at [http://localhost:5173/](http://localhost:5173/).

---

## API/Server Configuration

The frontend connects to the Nakama server using environment variables. Create a `.env` file in the `frontend` directory:

```env
VITE_NAKAMA_HOST=127.0.0.1
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_KEY=defaultkey
VITE_NAKAMA_SSL=false
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_NAKAMA_HOST` | Hostname of the Nakama server | `127.0.0.1` |
| `VITE_NAKAMA_PORT` | Port of the Nakama API | `7350` |
| `VITE_NAKAMA_KEY` | Server key configured in Nakama | `defaultkey` |
| `VITE_NAKAMA_SSL` | Use SSL for connection | `false` |

---

## How to Test Multiplayer

To test the multiplayer functionality locally, you need two separate clients:

1. **Open two browser windows**: Open [http://localhost:5173/](http://localhost:5173/) in two different browsers (e.g., Chrome and Firefox) or one in an incognito window. This ensures they generate unique device IDs.
2. **Authenticate**: Set a different username for each player on the Home Screen.
3. **Start a Match**:
   - **Method A (Matchmaking)**: Click "Find Match" on both clients. The Nakama matchmaker will automatically pair them.
   - **Method B (Room List)**: Player 1 creates a room via the "Create Room" dialog. Player 2 refreshes the Room List and joins Player 1's room.
4. **Play**: Take turns clicking on the grid. Observe real-time state updates across both windows.

---

## Deployment Process

### Build for Production
To generate a production-ready build, run:
```bash
npm run build
```
This command compiles the TypeScript code and bundles the assets into the `dist/` directory.

### Hosting
The `dist/` folder contains static assets that can be hosted on any web server or CDN:
- **Vercel/Netlify**: Connect your repository and set the build command to `npm run build` and output directory to `dist`.
- **Static Hosting (Nginx/S3)**: Copy the contents of `dist/` to your web root.

> [!NOTE]
> Ensure your production environmental variables are correctly set on your hosting provider to point to your production Nakama server IP/Domain.

---

## License

This project is for educational purposes.

