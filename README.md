# PrizeChips

**AI-powered chip design optimization. Better results in fewer runs.**

*Built by team Blur.*

PrizeChips is inspired by PrizePicks — the daily fantasy sports app where you build the most effective lineup by picking the right players. PrizeChips works the same way for chip design: instead of picking players, you're picking the optimal combination of chip settings (power, speed, size). Just like a sharp PrizePicks lineup isn't random guessing, PrizeChips doesn't test settings blindly — it uses AI to find the winning combination fast.

PrizeChips is a platform that uses AI to automatically find the best settings for a chip design. Instead of guessing and checking by hand, you tell PrizeChips what you want, and it figures out what to try next, getting smarter with each attempt.

## The problem it solves

Designing a chip means balancing three things that are always in tension:

- **Speed**: how fast does it run?
- **Power**: how much energy does it use?
- **Size** : how much physical space does it take up?

Finding settings that hit the right balance is slow, expensive work. Engineers often spend weeks testing combinations manually. With even 8 settings and 10 possible values each, there are 100 million possible combinations, far too many to explore by hand.

PrizeChips cuts through that. It uses AI to identify which settings are worth testing, skips the ones that won't pan out, and homes in on good results fast.

## How it works

1. You enter your goals — speed target, power limit, size constraint — and choose which settings to tune
2. The AI picks a set of promising configurations to test
3. PrizeChips runs them through the chip design tool automatically
4. The results get saved and fed back to the AI
5. The AI uses what it learned to pick better options next round
6. The loop repeats until you've hit your target or used up your attempts

The dashboard shows every run, every result, and what the AI is recommending so you always know what's happening.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| Backend | FastAPI (Python) |
| AI | Ollama (runs locally) |
| Optimization | Bayesian Optimization |
| Database | PostgreSQL |
| Chip design tool | OpenROAD |
| Containers | Docker |

## Getting started

### Prerequisites

- [Docker Desktop](https://www.docker.com/) installed and running
- Git
- Node.js (for development mode)

### Option 1 — Download the app (Mac)

Grab the latest `.dmg` from the `release/` folder, open it, and drag PrizeChips to your Applications folder. Docker Desktop must be running before you launch PrizeChips.

On first launch, pull the AI model once:

```bash
docker compose exec ollama ollama pull llama3.2
```

### Option 2 — Run in development mode

```bash
# Clone the repo
git clone https://github.com/slbullock23/ai-decisionmaking.git
cd ai-decisionmaking

# Install Electron dependencies
npm install

# Start the app (compiles Electron shell, then launches with Docker Compose)
npm run dev
```

PrizeChips will start Docker Compose automatically, which spins up Postgres, the FastAPI backend, the Next.js frontend, and Ollama. On first run, pull the AI model:

```bash
docker compose exec ollama ollama pull llama3.2
```

Once running:

- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:8000
- **API docs** → http://localhost:8000/docs

### Rebuild the DMG

If you've made changes to the Electron shell and want to produce a new installer:

```bash
npm run dist:mac
```

This outputs updated `.dmg` files to `release/`. To bump the version, update `"version"` in `package.json` before building.

> **Note:** Changes to the backend or frontend code are picked up automatically via Docker image rebuilds on next launch — you don't need to rebuild the DMG for those.

## Project structure

```
ai-decisionmaking/
├── electron/        # Electron shell (main process, splash screen)
├── frontend/        # Next.js web interface
├── backend/         # FastAPI server and optimization logic
├── release/         # Built DMG installers
├── docs/            # Architecture, Proposal and Requirements
├── docker-compose.yml
└── package.json     # Electron build config
```

## Who it's for

- **Physical design engineers** who want to stop guessing and start optimizing
- **CAD engineers** looking to automate repetitive tuning work
- **Hardware startups** that need fast, affordable design iteration without a big team

## Why local AI?

PrizeChips runs the AI model on your own machine using Ollama. That means:

- Your design data never leaves your network
- No usage fees or API costs
- Works offline
- You choose which model to run