# Architecture - Updated System Design


## System Components
The system is composed of four main pieces:

- **Next.js (Frontend)**
  - User-facing interface
  - Where users can input constraints for the chip.
  - Communicates with the backend through REST APIs

- **FastAPI (Backend API)**
  - Stores and retrieves user data
  - Computes optimized layout
  - Communicates directly with the AI (Ollama)

- **PostgreSQL (Database)**
  - Stores users, layouts, constraints, and input knobs

- **Ollama (Local AI Runtime)**
  - Analyzes past inputs, outputs, and patterns in the good and bad results
  - Returns suggestions of inputs that may produce better results.



## Data Flow
1. A user submits constraints (power, timing, area limits, knob ranges, etc.).

2. The backend stores the constraints, retrieves past run data, and shapes the valid search space.

3. The AI (Ollama) evaluates the constraints + past results and generates a batch of new candidate configurations.

4. These configurations are scheduled and run through the EDA tools (e.g., OpenROAD/OpenLane).

5. The backend parses the run results and feeds a summarized version back into the AI, creating a learning loop.

6. This loop repeats until enough good results are found.

7. The dashboard visualizes all constraints, runs, results, and AI suggestions for the user.


## Architectural Decision Records (ADRs)


### ADR 1: Use Ollama for Local AI Runtime

#### Decision
Use Ollama to run AI models locally for analysis and feedback generation.

#### Rationale
- The application requires AI to analyze group decisions and generate insights
- Ollama provides a simple way to run and switch between models locally
- The backend can communicate directly with Ollama through an API

#### Consequences

##### Pros
- Offline and local inference (no cloud dependency)
- Strong data privacy (user data stays on the machine or private network)
- No per-token or subscription costs
- Easy experimentation with different models
- Full control over performance and optimization

##### Cons
- Performance depends on available CPU/GPU
- Requires maintaining models and runtime updates
- Not ideal for very large-scale or highly concurrent usage
- Lacks built-in cloud features like monitoring and autoscaling

---

### ADR 2: Use FastAPI as the Backend Framework

#### Decision
Use FastAPI as the backend API framework.

#### Rationale
- The backend handles frontend requests, business logic, AI orchestration, and database access
- FastAPI offers strong performance, clear structure, and excellent Python support
- It integrates well with AI and data-processing libraries

#### Consequences

##### Pros
- High performance for typical API workloads
- Automatic request validation using type hints
- Async support for handling concurrent requests
- Built-in interactive API documentation
- Large ecosystem and strong community support

##### Cons
- Python can struggle under extreme concurrency
- Async programming requires careful design
- Production deployments need extra setup (e.g., Uvicorn + Gunicorn)
- Less opinionated framework means more architectural decisions are required
