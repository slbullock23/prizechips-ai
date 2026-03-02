# Blur

**AI-powered chip design optimization. Better results in fewer runs.**

Blur is a platform that uses AI to automatically find the best settings for a chip design. Instead of guessing and checking by hand, you tell Blur what you want, and it figures out what to try next, getting smarter with each attempt.

## The problem it solves

Designing a chip means balancing three things that are always in tension:

- **Speed**: how fast does it run?
- **Power**: how much energy does it use?
- **Size** : how much physical space does it take up?

Finding settings that hit the right balance is slow, expensive work. Engineers often spend weeks manually testing combinations. With even 8 settings and 10 possible values each, there are 100 million possible combinations, far too many to explore by hand.

Blur cuts through that. It uses AI to identify which settings are worth testing, skips the ones that won't work out, and dials in on good results fast.

## How it works

1. You enter your goals: speed target, power limit, size constraint and choose which settings to tune
2. The AI picks a set of promising configurations to test
3. Blur runs them through the chip design tool automatically
4. The results get saved and fed back to the AI
5. The AI uses what it learned to pick better options in the next round
6. The loop repeats until you've hit your target or used up your attempts

The dashboard shows every run, every result, and what the AI is recommending, so you always know what's happening.

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

- [Docker](https://www.docker.com/) and Docker Compose installed
- Git

### Run locally

```bash
# Clone the repo
git clone https://github.com/slbullock23/ai-decisionmaking.git
cd blur

# Start all 
docker compose up --build
```

Once running:

- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:8000
- **API docs** → http://localhost:8000/docs

## Project structure

```
ai-decisionmaking/
├── frontend/        # Next.js web interface
├── backend/         # FastAPI server and optimization logic
├── docs/            # Architecture, Proposal and Requirements
```

## Who it's for

- **Physical design engineers** who want to stop guessing and start optimizing
- **CAD engineers** looking to automate repetitive tuning work
- **Hardware startups** that need fast, affordable design iteration without a big team

## Why local AI?

Blur runs the AI model on your own machine using Ollama. That means:

- Your design data never leaves your network
- No usage fees or API costs
- Works offline
- You choose which model to run
