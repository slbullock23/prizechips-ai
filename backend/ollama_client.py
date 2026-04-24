"""
Ollama API client.

Calls the locally-running Ollama instance to generate AI explanations for
each chip design configuration. Falls back gracefully if Ollama is unavailable.
"""

import os
import subprocess
import time
import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL",    "llama3.2")
OLLAMA_TIMEOUT  = int(os.getenv("OLLAMA_TIMEOUT", "60"))


def ensure_ollama_running() -> bool:
    """Start Ollama if not already running. Returns True when ready."""
    try:
        with httpx.Client(timeout=3) as client:
            client.get(f"{OLLAMA_BASE_URL}/api/tags")
        return True  # already running
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    try:
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        print("WARNING: ollama not found in PATH — AI explanations unavailable.")
        return False

    for _ in range(20):
        time.sleep(1)
        try:
            with httpx.Client(timeout=2) as client:
                client.get(f"{OLLAMA_BASE_URL}/api/tags")
            print("Ollama started successfully.")
            return True
        except (httpx.ConnectError, httpx.TimeoutException):
            continue

    print("WARNING: Ollama did not become ready in time.")
    return False


def ensure_model_pulled() -> None:
    """Pull OLLAMA_MODEL if not already available."""
    try:
        with httpx.Client(timeout=300) as client:
            print(f"Pulling Ollama model '{OLLAMA_MODEL}' if needed…")
            client.post(
                f"{OLLAMA_BASE_URL}/api/pull",
                json={"name": OLLAMA_MODEL, "stream": False},
            )
            print(f"Model '{OLLAMA_MODEL}' ready.")
    except Exception as exc:
        print(f"WARNING: Could not pull model '{OLLAMA_MODEL}': {exc}")


def _build_prompt(knobs: dict, constraints: list[dict], wns: float, tns: float, power: float, area: float) -> str:
    knob_lines = "\n".join(f"  - {k}: {v}" for k, v in knobs.items())
    constraint_lines = "\n".join(
        f"  - {c['metric']}: min={c.get('min_val')}, max={c.get('max_val')}" for c in constraints
    ) or "  (none specified)"

    return f"""Chip design result. Knobs: {knob_lines}. WNS={wns:.3f}ns, Power={power:.1f}mW, Area={area:.0f}um2. Constraints: {constraint_lines}.
In 1-2 sentences, explain the timing/power/area trade-off. Be concise."""


def get_explanation(knobs: dict, constraints: list[dict], wns: float, tns: float, power: float, area: float) -> str:
    """
    Ask Ollama to explain a chip design result.
    Returns a fallback string if Ollama is not reachable.
    """
    prompt = _build_prompt(knobs, constraints, wns, tns, power, area)

    try:
        with httpx.Client(timeout=OLLAMA_TIMEOUT) as client:
            response = client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            return response.json().get("response", "").strip()
    except (httpx.ConnectError, httpx.TimeoutException, Exception):
        return ""


def get_run_summary(run_name: str, iterations: int, best_wns: float, best_power: float, best_area: float) -> str:
    """
    Generate a plain-English one-liner for non-technical readers.
    Returns a plain-language fallback if Ollama is unavailable.
    """
    timing_fact = (
        "The chip successfully runs at its target speed."
        if best_wns >= 0
        else "The chip could not quite reach its target speed."
    )
    prompt = (
        f"One sentence, plain English, no jargon: {timing_fact} "
        f"Power: {best_power:.0f}mW. Size: {best_area:.0f}um2. Write only the sentence."
    )
    try:
        with httpx.Client(timeout=OLLAMA_TIMEOUT) as client:
            response = client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            return response.json().get("response", "").strip()
    except (httpx.ConnectError, httpx.TimeoutException):
        if best_wns >= 0:
            return f"After {iterations} tries, found a design that hits its speed target while using about {best_power:.0f} mW — roughly as much as a dim LED."
        else:
            return f"After {iterations} tries, the best design comes close to the speed target but uses only about {best_power:.0f} mW of power."
    except Exception:
        return f"Optimization finished after {iterations} attempts."
