# Bar Trivia

A real-time bar trivia web app where a host runs a trivia event and players join on their phones.

## Features

- **Host side**: Create games from a question template (or blank), manage question banks with category/question/answer fields, control game flow, reveal questions like a presentation, score answers, track the scoreboard
- **Player side**: Scan QR code or enter a game code to join, submit answers, choose point wagers per round
- **Game structure**: 6 rounds of 3 questions each. Wagers are 1/2/3 pts in rounds 1–3 and 2/4/6 pts in rounds 4–6. Each wager value can only be used once per round.
- **Templates**: Save and reuse question sets across games. Built-in "Sample Questions" and "Blank" templates included.
- **Real-time**: All communication via WebSockets (Socket.IO)
- **Persistence**: Game state and templates are saved to JSON files — games survive server restarts
- **Session recovery**: Players and hosts automatically reconnect after browser refresh or brief disconnects
- **Remote access**: Server auto-launches a Cloudflare tunnel on startup so players can join from outside your local network

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) binary (for remote tunnel — place at `C:\Users\Me\Downloads\cloudflared-windows-amd64.exe`)

## Setup

### 1. Install dependencies

```bash
cd server
npm install
```

```bash
cd client
npm install
```

### 2. Build the client

```bash
cd client
npm run build
```

### 3. Start the server

```bash
cd server
npm run dev
```

Everything runs on a single port: `http://localhost:3001`

The server serves the React app, the REST API (`/api`), and the WebSocket — all on port 3001. A Cloudflare tunnel is automatically started so remote players can connect.

## How to Play

### Host
1. Go to `http://localhost:3001`
2. Click **I'm the Host**
3. If a previous game session is found you'll be asked to **Continue** or **Start Fresh**
4. Select a question template (e.g. "Blank" to enter your own questions, or "Sample Questions" to use pre-filled ones) and click **Create New Game**
5. A QR code and game code will appear — share them with players
6. Go to the **Questions** tab to fill in each question's category, question text, and answer (6 rounds × 3 questions)
7. Once players have joined, click **Start Game**
8. Reveal questions one at a time using **Game Control**; players answer on their phones
9. After closing answers, go to the **Scores** tab to mark answers correct/incorrect
10. Complete the round and continue to the next

### Players
1. Scan the QR code or go to `http://localhost:3001` and click **I'm a Player**
2. Enter the game code and your team name
3. When a question appears, type your answer and pick a point wager
4. Each wager value can only be used **once per round**

## Tech Stack

- **Server**: Node.js, Express, Socket.IO, TypeScript
- **Client**: React 18, Socket.IO Client, TypeScript (built with Create React App)
- **Transport**: Single port (3001) — Express serves the React static build, REST API, and WebSocket
- **Data**: JSON file persistence (`server/data/`) — no database required
- **Tunnel**: Cloudflare Quick Tunnels via `cloudflared` for remote access
