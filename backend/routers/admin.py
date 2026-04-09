import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_EMAIL = "admin@blur.local"


def _get_or_create_admin_user(db: Session) -> models.User:
    """Ensure the admin has a User row in the DB, creating one if needed."""
    admin = db.query(models.User).filter(models.User.email == ADMIN_EMAIL).first()
    if not admin:
        admin = models.User(
            email=ADMIN_EMAIL,
            username=auth_utils.ADMIN_USERNAME,
            hashed_password=auth_utils.hash_password(auth_utils.ADMIN_PASSWORD),
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    return admin


# ── Admin auth ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=schemas.Token)
def admin_login(body: schemas.AdminLogin, db: Session = Depends(get_db)):
    if body.username != auth_utils.ADMIN_USERNAME or body.password != auth_utils.ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

    admin_user = _get_or_create_admin_user(db)
    token = auth_utils.create_access_token({"sub": str(admin_user.id), "role": "admin"})
    return {"access_token": token}


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[schemas.UserAdminOut])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.get_admin_user),
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        run_count = db.query(models.Run).filter(models.Run.user_id == u.id).count()
        result.append(schemas.UserAdminOut(
            id=u.id,
            email=u.email,
            username=u.username,
            created_at=u.created_at,
            run_count=run_count,
        ))
    return result


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth_utils.get_admin_user),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete the admin account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()


# ── Runs (cross-user) ─────────────────────────────────────────────────────────

@router.get("/runs", response_model=list[schemas.RunWithOwner])
def list_all_runs(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.get_admin_user),
):
    runs = db.query(models.Run).order_by(models.Run.created_at.desc()).all()
    result = []
    for r in runs:
        result.append(schemas.RunWithOwner(
            id=r.id,
            name=r.name,
            status=r.status,
            max_iterations=r.max_iterations,
            created_at=r.created_at,
            owner_username=r.owner.username,
        ))
    return result


@router.get("/runs/{run_id}", response_model=schemas.RunOut)
def get_any_run(
    run_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.get_admin_user),
):
    run = db.query(models.Run).filter(models.Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/runs/{run_id}/configurations", response_model=list[schemas.ConfigurationOut])
def get_any_configurations(
    run_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.get_admin_user),
):
    run = db.query(models.Run).filter(models.Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return (
        db.query(models.Configuration)
        .filter(models.Configuration.run_id == run_id)
        .order_by(models.Configuration.iteration)
        .all()
    )
