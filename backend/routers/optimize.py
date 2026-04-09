import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
import models
import schemas
import auth as auth_utils
from optimizer import run_optimization, KnobSpec
import predictor

log = logging.getLogger(__name__)

router = APIRouter(prefix="/runs", tags=["optimization"])


def _run_in_background(run_id: int, knob_specs: list[KnobSpec]) -> None:
    """Background task wrapper — opens its own DB session."""
    db = SessionLocal()
    try:
        run_optimization(run_id=run_id, knob_specs=knob_specs, db=db)
    except Exception:
        log.exception("Unhandled exception in background optimization for run %d", run_id)
    finally:
        db.close()


@router.post("/{run_id}/optimize", status_code=status.HTTP_202_ACCEPTED)
def start_optimization(
    run_id: int,
    body: schemas.OptimizeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    run = db.query(models.Run).filter(models.Run.id == run_id, models.Run.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status == models.RunStatus.running:
        raise HTTPException(status_code=409, detail="Optimization already in progress")
    if len(body.knobs) == 0:
        raise HTTPException(status_code=422, detail="At least one knob is required")

    knob_specs = [KnobSpec(name=k.name, min_val=k.min_val, max_val=k.max_val) for k in body.knobs]
    background_tasks.add_task(_run_in_background, run_id, knob_specs)

    return {"message": "Optimization started", "run_id": run_id}


@router.get("/{run_id}/configurations", response_model=list[schemas.ConfigurationOut])
def get_configurations(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    run = db.query(models.Run).filter(models.Run.id == run_id, models.Run.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    return (
        db.query(models.Configuration)
        .filter(models.Configuration.run_id == run_id)
        .order_by(models.Configuration.iteration)
        .all()
    )


@router.post("/{run_id}/predict", response_model=schemas.PredictionResponse)
def predict_what_if(
    run_id: int,
    body: schemas.PredictionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """
    Predict WNS/Power/Area for a hypothetical set of knob values using the
    Gaussian Process surrogate model trained on this run's history.
    Requires at least 3 completed iterations.
    """
    run = db.query(models.Run).filter(
        models.Run.id == run_id,
        models.Run.user_id == current_user.id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    try:
        result = predictor.predict(run_id, body.knobs, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return schemas.PredictionResponse(
        wns=schemas.MetricPrediction(**result["wns"]),
        power=schemas.MetricPrediction(**result["power"]),
        area=schemas.MetricPrediction(**result["area"]),
        data_points=result["data_points"],
        engine=result["engine"],
    )
