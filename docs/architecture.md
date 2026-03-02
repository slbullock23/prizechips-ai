# 🏗️ Architecture
*"How the pieces talk to each other"*

This document explains how the frontend, backend, database, and AI layer connect, how they function and how data moves throughout the system.

---


## System Components
The system is composed of four main pieces:

- **Next.js (Frontend)**
  - User-facing interface
  - Where users submit decisions and confidence levels
  - Communicates with the backend through REST APIs

- **FastAPI (Backend API)**
  - Validates user input
  - Stores and retrieves user data
  - Computes decisions and scores
  - Communicates directly with the AI (Ollama)

- **PostgreSQL (Database)**
  - Stores users, decisions, confidence scores, feedback, and final outcomes
  - Stores historical performance data 

- **Ollama (Local AI Runtime)**
  - Analyzes group input
  - Detects disagreement, groupthink, and risks
  - Returns structured feedback and insights to the backend

#### Diagram
![alt text](<ArchitectureDiagram.png>)
---

## Data Flow
1. A user submits a decision along with a confidence score from the frontend  
2. The backend validates and records the input in the database  
3. The backend sends the aggregated data to the AI layer  
4. The AI analyzes the inputs for:
   - Conflicting opinions
   - Overconfidence or imbalance
   - Missing or overlooked context  
5. Feedback is returned to the backend and sent to the user  
6. Once the real-world outcome is known, it is logged and used to update scoring and accuracy metrics  

#### Diagram
![alt text](<DataFlowDiagram.png>)
---

# Architectural Decision Records (ADRs)

This document records key architectural decisions made for the system, including the reasoning behind them and their trade-offs.

---

## ADR 1: Use Ollama for Local AI Runtime

### Decision
Use Ollama to run AI models locally for analysis and feedback generation.

### Rationale
- The application requires AI to analyze group decisions and generate insights
- Ollama provides a simple way to run and switch between models locally
- The backend can communicate directly with Ollama through an API

### Consequences

#### Pros
- Offline and local inference (no cloud dependency)
- Strong data privacy (user data stays on the machine or private network)
- No per-token or subscription costs
- Easy experimentation with different models
- Full control over performance and optimization

#### Cons
- Performance depends on available CPU/GPU
- Requires maintaining models and runtime updates
- Not ideal for very large-scale or highly concurrent usage
- Lacks built-in cloud features like monitoring and autoscaling

---

## ADR 2: Use FastAPI as the Backend Framework

### Decision
Use FastAPI as the backend API framework.

### Rationale
- The backend handles frontend requests, business logic, AI orchestration, and database access
- FastAPI offers strong performance, clear structure, and excellent Python support
- It integrates well with AI and data-processing libraries

### Consequences

#### Pros
- High performance for typical API workloads
- Automatic request validation using type hints
- Async support for handling concurrent requests
- Built-in interactive API documentation
- Large ecosystem and strong community support

#### Cons
- Python can struggle under extreme concurrency
- Async programming requires careful design
- Production deployments need extra setup (e.g., Uvicorn + Gunicorn)
- Less opinionated framework means more architectural decisions are required