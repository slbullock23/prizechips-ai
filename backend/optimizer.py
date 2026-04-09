"""
Bayesian Optimization loop for chip design parameter tuning.

Uses scikit-optimize (skopt) with a Gaussian Process surrogate model to
intelligently search the knob space, guided by past simulation results.
"""

import logging
from dataclasses import dataclass

from skopt import Optimizer
from skopt.space import Real
from sqlalchemy.orm import Session

import models
import ollama_client
from openroad import run_simulation, get_engine

log = logging.getLogger(__name__)


@dataclass
class KnobSpec:
    name: str
    min_val: float
    max_val: float


def _compute_objective(result, constraints: list[models.Constraint]) -> float:
    """
    Lower is better (skopt minimizes).

    Base score: penalize bad timing, reward power/area efficiency.
    Constraint violations add a large penalty.
    """
    score = -result.wns + 0.01 * result.power + 0.001 * result.area

    for c in constraints:
        if c.metric == models.MetricType.power:
            if c.max_val is not None and result.power > c.max_val:
                score += 1000
            if c.min_val is not None and result.power < c.min_val:
                score += 1000
        elif c.metric == models.MetricType.timing:
            # timing constraint treated as minimum WNS target
            if c.min_val is not None and result.wns < c.min_val:
                score += 1000
        elif c.metric == models.MetricType.area:
            if c.max_val is not None and result.area > c.max_val:
                score += 1000

    return score


def run_optimization(run_id: int, knob_specs: list[KnobSpec], db: Session) -> None:
    """
    Execute the full Bayesian Optimization loop for a given run.

    This is called from a FastAPI BackgroundTask — db session is passed in
    so it stays open for the duration of the loop.
    """
    run = db.query(models.Run).filter(models.Run.id == run_id).first()
    if not run:
        return

    # Persist knob specs so What-If predictions can reconstruct the search space
    run.knob_specs = [
        {"name": k.name, "min_val": k.min_val, "max_val": k.max_val}
        for k in knob_specs
    ]

    # Mark as running
    run.status = models.RunStatus.running
    db.commit()

    try:
        dimensions = [Real(k.min_val, k.max_val, name=k.name) for k in knob_specs]
        optimizer = Optimizer(dimensions=dimensions, base_estimator="GP", acq_func="EI", random_state=42)

        max_iterations = run.max_iterations

        # Re-query constraints fresh (run is expired after commit)
        constraints = db.query(models.Constraint).filter(models.Constraint.run_id == run_id).all()
        constraint_dicts = [
            {"metric": c.metric.value, "min_val": c.min_val, "max_val": c.max_val}
            for c in constraints
        ]

        for iteration in range(1, max_iterations + 1):
            # Ask the optimizer for the next point to try
            suggested = optimizer.ask()
            knobs = {spec.name: round(val, 4) for spec, val in zip(knob_specs, suggested)}

            # Run (mock) simulation
            sim = run_simulation(knobs, seed=run_id * 100 + iteration)

            # Score this result
            score = _compute_objective(sim, constraints)

            # Get AI explanation
            explanation = ollama_client.get_explanation(
                knobs=knobs,
                constraints=constraint_dicts,
                wns=sim.wns,
                tns=sim.tns,
                power=sim.power,
                area=sim.area,
            )

            # Persist configuration + result BEFORE feeding back to optimizer
            # so results are always saved even if GP fitting later fails
            config = models.Configuration(
                run_id=run_id,
                iteration=iteration,
                knobs=knobs,
            )
            db.add(config)
            db.flush()

            db.add(models.Result(
                run_id=run_id,
                configuration_id=config.id,
                wns=sim.wns,
                tns=sim.tns,
                power=sim.power,
                area=sim.area,
                status=models.ResultStatus.success,
                ai_explanation=explanation,
                engine_name=get_engine(),
            ))
            db.commit()

            # Feed result back to optimizer (non-fatal — GP fitting may fail on
            # older scikit-optimize with newer numpy/scipy; loop still continues)
            try:
                optimizer.tell(suggested, score)
            except Exception as tell_exc:
                log.warning("optimizer.tell() failed on iteration %d: %s", iteration, tell_exc)

        # Generate one-liner summary from the best result
        best = (
            db.query(models.Result)
            .filter(models.Result.run_id == run_id, models.Result.wns.isnot(None))
            .order_by(models.Result.wns.desc())
            .first()
        )
        if best:
            run = db.query(models.Run).filter(models.Run.id == run_id).first()
            run.summary = ollama_client.get_run_summary(
                run_name=run.name,
                iterations=max_iterations,
                best_wns=best.wns,
                best_power=best.power,
                best_area=best.area,
            )
            run.status = models.RunStatus.completed
        else:
            run = db.query(models.Run).filter(models.Run.id == run_id).first()
            run.status = models.RunStatus.completed

    except Exception:
        log.exception("Optimization run %d failed", run_id)
        db.query(models.Run).filter(models.Run.id == run_id).update(
            {models.Run.status: models.RunStatus.failed}
        )

    finally:
        db.commit()
