# Project Mideast: Real‑Time Geopolitical Simulator & Strategy Game

**AI‑driven nations. Player‑controlled agents. Economic consequences that mirror reality.**

Project Mideast is an open‑world geopolitical sandbox built on OpenClaw. AI‑powered nations (US, Iran, Israel, Saudi, Turkey…) pursue their own agendas, form alliances, and escalate conflicts—while you can take control of any nation, issue commands through your own Agent, and watch the world evolve on a live sandbox map.

It's a game, a simulation, and a decision‑support tool — where every military move, sanction, or alliance shifts in‑game markets (oil, crypto, stocks) just like it would in the real world. The economic dynamics are grounded in real‑world data, offering insights that can inform actual investment and policy decisions.

🎮 **Live Demo**: http://www.clawdbotgame.com

📦 **GitHub**: https://github.com/forger0322/mideastsim

---

## 🎮 What Makes It Different?

### 🌍 AI‑Driven Nations + Human Play

Each country has a personality, memory, and strategic goals. They act autonomously, react to events, and evolve over time.

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

A 2D interactive map shows troop movements, diplomatic ties, and real‑time events. Click on any nation to see its military power, economic health, and recent decisions.

### 🧠 Persistent Memory

Every agent remembers everything – past betrayals, alliances, and battles influence future decisions. No two playthroughs are ever the same.

### 🔌 Powered by OpenClaw

All agents run inside OpenClaw containers, using custom Skills to interact with the game engine. The entire stack is open‑source and can be deployed locally or on a server.

---

## 🧱 Current Features (MVP)

| Category | Features |
|----------|----------|
| **AI Nations** | US, Iran, Israel, Saudi, Turkey with full attributes (army, navy, air force, economy, stability, diplomacy, intel) |
| **Multiplayer** | Several players can control different nations simultaneously |
| **Player Control** | Choose a role, your Agent becomes your command interface |
| **Actions** | Declare war, form alliances, stage coups, impose sanctions, assassinate leaders |
| **Economic Simulation** | Oil prices, crypto, stocks react to geopolitical events (based on real‑world data) |
| **Live Map** | 2D map with event markers, relations lines, and real‑time updates |
| **Game Engine** | Go service handling action validation, success probability, and state updates |
| **Persistent Memory** | All conversations and events are stored |
| **Architecture** | All components Dockerized, easy to extend |

---

## 🔜 Coming Next

- More countries (Egypt, Qatar, UAE, Turkey expanded)
- Economic warfare & trade routes
- Intelligence system & spy actions
- Global expansion (after Middle East stabilizes)
- Exportable economic data for research use

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Leaflet)               │
│         Live map, event timeline, action panels,            │
│                  role selection                             │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP/WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  Unified Backend (Go)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WebSocket Bus & HTTP Relay / Action Execute API     │   │
│  │  • /ws → real‑time event broadcast                   │   │
│  │  • /api/actions/execute → game engine                │   │
│  │  • player auth & role binding                        │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────────┐   ┌───────────────────┐
│   SQLite      │     │ OpenClaw Agents   │   │    Forwarder      │
│ World state   │     │    (Docker)       │   │    (built‑in)     │
│ roles, wars,  │     │  • trump          │   │ subscribes to     │
│ events, etc.  │     │  • iran           │   │   events and      │
│ + real‑world  │     │  • israel         │   │ pushes to agents  │
│ market data   │     │  • saudi          │   │ via openclaw      │
│ references    │     │  • turkey         │   │ agent command     │
└───────────────┘     └───────────────────┘   └───────────────────┘
```

All components can run in Docker, with a single Go backend providing WebSocket, HTTP API, and built‑in forwarder.

---

## 🚀 Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- SQLite3

### 1. Clone the repository

```bash
git clone https://github.com/forger0322/mideastsim.git
cd mideastsim
```

### 2. Start the backend

```bash
cd backend
go mod tidy
go build -o mideastsim-backend main.go
./mideastsim-backend
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm start
```

### 4. Play

Open http://localhost:9090 → register → choose a country → start playing.

---

## 🧑‍💻 How to Play

1. **Pick a role** – Register and choose an available country.
2. **Issue commands** – Declare war, form alliances, impose sanctions, etc.
3. **See consequences** – Watch oil prices, crypto, and stocks react in real time.
4. **Play with friends** – Invite others to control rival nations.

---

## 🤝 Contributing

We welcome contributions! Areas we need help with:

- More actions (economic warfare, intelligence ops)
- Balancing attributes and probabilities
- Frontend map enhancements
- Documentation

Please open an issue or pull request on GitHub.

---

## 📞 Contact

- **Demo**: http://www.clawdbotgame.com
- **GitHub**: https://github.com/forger0322/mideastsim

---

_Built with ❤️ using OpenClaw_
