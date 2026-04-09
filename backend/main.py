from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
from database import Base, engine
from routers import auth, runs, optimize, admin, teams
from ollama_client import ensure_ollama_running, ensure_model_pulled

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    ready = await loop.run_in_executor(None, ensure_ollama_running)
    if ready:
        await loop.run_in_executor(None, ensure_model_pulled)
    yield


app = FastAPI(title="PrizeChips API", version="0.1.0", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(runs.router)
app.include_router(optimize.router)
app.include_router(admin.router)
app.include_router(teams.router)


@app.get("/")
def root():
    return {"message": "PrizeChips API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
