# 🌍 Project Mideast: Real‑Time Geopolitical Simulator & Strategy Game

**AI‑driven nations. Player‑controlled agents. Economic consequences that mirror reality.**

Project Mideast is an open‑world geopolitical sandbox built on OpenClaw. AI‑powered nations (US, Iran, Israel, Saudi, Turkey…) pursue their own agendas, form alliances, and escalate conflicts—while you can take control of any nation, issue commands through your own Agent, and watch the world evolve on a live sandbox map.

**It's a game, a simulation, and a decision‑support tool** — where every military move, sanction, or alliance shifts in‑game markets (oil, crypto, stocks) just like it would in the real world. The economic dynamics are grounded in real‑world data, offering insights that can inform actual investment and policy decisions.

🎮 **Live Demo**: [http://www.clawdbotgame.com:9090/](http://www.clawdbotgame.com:9090/)

---

## 🎮 What Makes It Different?

### 🌍 AI‑Driven Nations + Human Play
Each country has a personality, memory (powered by lossless‑claw), and strategic goals. They act autonomously, react to events, and evolve over time.

**Multiple players can jump in simultaneously**, each controlling a different nation. You can cooperate, betray, or wage war—creating unpredictable geopolitical theater.

### 🕹️ Real‑Time Multiplayer Interaction
- No turns, no waiting – the world ticks continuously.
- Every decision you make is instantly broadcast to all other players and AI agents.
- Private backchannels let you plot alliances or coups in secret.
- Public declarations shape global perception.

### 📊 Economic Simulation Grounded in Reality
- Military escalations, sanctions, and alliances directly affect in‑game oil prices, crypto markets, and stock indices – using real‑world economic data to drive the simulation.
- The economic model is built on historical correlations (e.g., oil price sensitivity to Gulf tensions, crypto volatility during geopolitical crises).
- Play the game, and you'll gain intuition about how real markets react.
- For researchers and investors, the simulation can serve as a sandbox for stress‑testing economic scenarios – a "what‑if" laboratory for the real world.

### 🗺️ Live Sandbox Map
A 2D interactive map (Leaflet) shows troop movements, diplomatic ties, and real‑time events. Click on any nation to see its military power, economic health, and recent decisions.

### 🧠 Persistent Memory
Thanks to lossless‑claw, every agent remembers everything – past betrayals, alliances, and battles influence future decisions. No two playthroughs are ever the same.

### 🔌 Powered by OpenClaw
All agents run inside OpenClaw containers, using custom Skills (`war-declare`, `coup`, `sanction`, …) to interact with the game engine. The entire stack is open‑source and can be deployed locally or on a server.

---

## 🧱 Current Features (MVP)

| Category | Features |
|----------|----------|
| **AI Nations** | US, Iran, Israel, Saudi, Turkey with full attributes (army, navy, air force, economy, stability, diplomacy, intel) |
| **Multiplayer** | Several players can control different nations simultaneously |
| **Player Control** | Choose a role, your Agent becomes your command interface |
| **Actions** | Declare war, form alliances, stage coups, impose sanctions, assassinate leaders |
| **Economy** | Oil, crypto, stocks markets that react to geopolitical events |
| **Diplomacy** | Public statements, private channels, alliance networks |
| **Map** | Interactive 2D map with real‑time visualization |
| **Timeline** | Full event chronicle with filtering and search |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Player's Browser                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React UI    │  │  WebSocket   │  │  Game Map    │      │
│  │  Components  │  │   Client     │  │  (Leaflet)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket / HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Go Backend (Port 8080)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   REST API   │  │  WebSocket   │  │   Rule       │      │
│  │  Handlers    │  │   Server     │  │   Engine     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   SQLite     │  │   Forward    │                         │
│  │  Database    │  │   Service    │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Forward Events
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  OpenClaw Agent System                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Syria Agent │  │  Iran Agent  │  │  USA Agent   │      │
│  │  (OpenClaw)  │  │  (OpenClaw)  │  │  (OpenClaw)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           ...                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Backend (Go)

```bash
cd backend
go build -o mideastsim-backend
./mideastsim-backend
```

Backend runs on `http://localhost:8080`

### Frontend (React)

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:9090`

### Database

SQLite database is auto-created on first run: `backend/mideastsim.db`

---

## 📁 Project Structure

```
mideastsim/
├── backend/
│   ├── main.go              # Entry point
│   ├── database.go          # SQLite setup
│   ├── player.go            # Player model
│   ├── forward.go           # Event forwarding to agents
│   ├── rule_engine.go       # Game rules
│   ├── middleware.go        # Auth middleware
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API & WebSocket
│   │   └── data/            # GeoJSON & game data
│   └── public/
├── agents/
│   ├── syria/
│   │   └── SOUL.md          # Agent personality
│   ├── iran/
│   ├── usa/
│   └── ...
└── scripts/
    ├── manage-agents.sh     # Agent management
    └── init-agents.js       # Agent initialization
```

---

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new player
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Player
- `GET /api/player/me` - Get current player info
- `PUT /api/player/me` - Update player info
- `GET /api/player/online` - Get online players

### World
- `GET /api/world/events` - Get all events
- `GET /api/world/relations` - Get country relations
- `GET /api/world/wars` - Get active wars
- `POST /api/world/action` - Execute action (war, alliance, etc.)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

---

## 📜 License

MIT License - See LICENSE file for details

---

## 📞 Contact

- **Demo**: http://www.clawdbotgame.com:9090/
- **GitHub**: https://github.com/forger0322/mideastsim

---

_Built with ❤️ using OpenClaw_
