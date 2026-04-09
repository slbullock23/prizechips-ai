from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/runs", tags=["runs"])


@router.post("", response_model=schemas.RunOut, status_code=status.HTTP_201_CREATED)
def create_run(
    body: schemas.RunCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    run = models.Run(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        max_iterations=body.max_iterations,
    )
    db.add(run)
    db.flush()  # get run.id before adding constraints

    for c in body.constraints:
        db.add(models.Constraint(run_id=run.id, metric=c.metric, min_val=c.min_val, max_val=c.max_val))

    db.commit()
    db.refresh(run)
    return run


@router.get("", response_model=list[schemas.RunSummary])
def list_runs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    return db.query(models.Run).filter(models.Run.user_id == current_user.id).order_by(models.Run.created_at.desc()).all()


@router.get("/{run_id}", response_model=schemas.RunOut)
def get_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    run = db.query(models.Run).filter(models.Run.id == run_id, models.Run.user_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
