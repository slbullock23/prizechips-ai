"""
Teams, invites, config reviews, and voting endpoints.
"""

import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/teams", tags=["teams"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_team_or_404(team_id: int, db: Session) -> models.Team:
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def _get_membership(team_id: int, user_id: int, db: Session) -> models.TeamMembership | None:
    return (
        db.query(models.TeamMembership)
        .filter(
            models.TeamMembership.team_id == team_id,
            models.TeamMembership.user_id == user_id,
        )
        .first()
    )


def _require_member(team: models.Team, user: models.User, db: Session) -> models.TeamMembership:
    m = _get_membership(team.id, user.id, db)
    if not m:
        raise HTTPException(status_code=403, detail="Not a member of this team")
    return m


def _require_owner(team: models.Team, user: models.User, db: Session) -> models.TeamMembership:
    m = _require_member(team, user, db)
    if m.role != models.TeamRole.owner:
        raise HTTPException(status_code=403, detail="Only team owners can do this")
    return m


def _build_team_out(team: models.Team, current_user_id: int, db: Session) -> schemas.TeamOut:
    member_count = (
        db.query(models.TeamMembership)
        .filter(models.TeamMembership.team_id == team.id)
        .count()
    )
    pending_count = (
        db.query(models.ConfigReview)
        .filter(
            models.ConfigReview.team_id == team.id,
            models.ConfigReview.status == models.ReviewStatus.pending,
        )
        .count()
    )
    m = _get_membership(team.id, current_user_id, db)
    my_role = m.role.value if m else None

    return schemas.TeamOut(
        id=team.id,
        name=team.name,
        description=team.description,
        invite_code=team.invite_code,
        approval_threshold=team.approval_threshold,
        created_at=team.created_at,
        member_count=member_count,
        pending_review_count=pending_count,
        my_role=my_role,
    )


def _build_review_out(review: models.ConfigReview) -> schemas.ConfigReviewOut:
    approve_count = sum(1 for v in review.votes if v.vote == models.VoteChoice.approve)
    cfg = review.configuration
    return schemas.ConfigReviewOut(
        id=review.id,
        configuration_id=review.configuration_id,
        team_id=review.team_id,
        submitted_by=review.submitted_by.username,
        status=review.status.value,
        submitted_at=review.submitted_at,
        vote_count=len(review.votes),
        approve_count=approve_count,
        run_name=cfg.run.name,
        iteration=cfg.iteration,
    )


# ── Team CRUD ─────────────────────────────────────────────────────────────────

@router.post("", response_model=schemas.TeamOut, status_code=status.HTTP_201_CREATED)
def create_team(
    body: schemas.TeamCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    invite_code = secrets.token_urlsafe(6)[:8]
    team = models.Team(
        name=body.name,
        description=body.description,
        invite_code=invite_code,
        approval_threshold=body.approval_threshold,
        created_by_id=current_user.id,
    )
    db.add(team)
    db.flush()

    membership = models.TeamMembership(
        team_id=team.id,
        user_id=current_user.id,
        role=models.TeamRole.owner,
    )
    db.add(membership)
    db.commit()
    db.refresh(team)

    return _build_team_out(team, current_user.id, db)


@router.get("", response_model=list[schemas.TeamOut])
def list_my_teams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    memberships = (
        db.query(models.TeamMembership)
        .filter(models.TeamMembership.user_id == current_user.id)
        .all()
    )
    return [_build_team_out(m.team, current_user.id, db) for m in memberships]


@router.get("/{team_id}", response_model=schemas.TeamDetailOut)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    team = _get_team_or_404(team_id, db)
    _require_member(team, current_user, db)

    members = [
        schemas.TeamMemberOut(
            user_id=m.user_id,
            username=m.user.username,
            role=m.role.value,
            joined_at=m.joined_at,
        )
        for m in team.memberships
    ]
    return schemas.TeamDetailOut(
        team=_build_team_out(team, current_user.id, db),
        members=members,
    )


@router.post("/join", response_model=schemas.TeamOut)
def join_team(
    body: schemas.JoinTeamRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    team = db.query(models.Team).filter(models.Team.invite_code == body.invite_code).first()
    if not team:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    existing = _get_membership(team.id, current_user.id, db)
    if existing:
        raise HTTPException(status_code=409, detail="Already a member of this team")

    db.add(models.TeamMembership(
        team_id=team.id,
        user_id=current_user.id,
        role=models.TeamRole.member,
    ))
    db.commit()

    return _build_team_out(team, current_user.id, db)


@router.patch("/{team_id}/members/{user_id}/role", response_model=schemas.TeamMemberOut)
def change_member_role(
    team_id: int,
    user_id: int,
    body: schemas.ChangeRoleRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    team = _get_team_or_404(team_id, db)
    _require_owner(team, current_user, db)

    if body.role not in ("owner", "member", "board"):
        raise HTTPException(status_code=422, detail="Role must be owner, member, or board")

    target = _get_membership(team_id, user_id, db)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    target.role = models.TeamRole(body.role)
    db.commit()

    return schemas.TeamMemberOut(
        user_id=target.user_id,
        username=target.user.username,
        role=target.role.value,
        joined_at=target.joined_at,
    )


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    team = _get_team_or_404(team_id, db)
    _require_owner(team, current_user, db)

    if user_id == current_user.id:
        owner_count = sum(
            1 for m in team.memberships if m.role == models.TeamRole.owner
        )
        if owner_count <= 1:
            raise HTTPException(status_code=409, detail="Cannot remove the sole owner")

    target = _get_membership(team_id, user_id, db)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(target)
    db.commit()


# ── Reviews ───────────────────────────────────────────────────────────────────

@router.post("/{team_id}/reviews", response_model=schemas.ConfigReviewOut, status_code=status.HTTP_201_CREATED)
def submit_review(
    team_id: int,
    body: schemas.SubmitReviewRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    team = _get_team_or_404(team_id, db)
    _require_member(team, current_user, db)

    config = db.query(models.Configuration).filter(
        models.Configuration.id == body.configuration_id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    # Check ownership — only run owner can submit
    if config.run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your run")

    # Prevent duplicate submissions to the same team
    existing = db.query(models.ConfigReview).filter(
        models.ConfigReview.configuration_id == body.configuration_id,
        models.ConfigReview.team_id == team_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already submitted to this team")

    review = models.ConfigReview(
        configuration_id=body.configuration_id,
        team_id=team_id,
        submitted_by_id=current_user.id,
        status=models.ReviewStatus.pending,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return _build_review_out(review)


@router.get("/{team_id}/reviews", response_model=list[schemas.ConfigReviewOut])
def list_reviews(
    team_id: int,
    review_status: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    team = _get_team_or_404(team_id, db)
    _require_member(team, current_user, db)

    q = db.query(models.ConfigReview).filter(models.ConfigReview.team_id == team_id)
    if review_status:
        try:
            q = q.filter(models.ConfigReview.status == models.ReviewStatus(review_status))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid status value")

    reviews = q.order_by(models.ConfigReview.submitted_at.desc()).all()
    return [_build_review_out(r) for r in reviews]


@router.get("/{team_id}/reviews/{review_id}", response_model=schemas.ReviewDetailOut)
def get_review(
    team_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    team = _get_team_or_404(team_id, db)
    _require_member(team, current_user, db)

    review = db.query(models.ConfigReview).filter(
        models.ConfigReview.id == review_id,
        models.ConfigReview.team_id == team_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    votes = [
        schemas.ReviewVoteOut(
            voter_username=v.voter.username,
            vote=v.vote.value,
            comment=v.comment,
            voted_at=v.voted_at,
        )
        for v in review.votes
    ]
    return schemas.ReviewDetailOut(review=_build_review_out(review), votes=votes)


@router.post("/{team_id}/reviews/{review_id}/vote", response_model=schemas.ConfigReviewOut)
def cast_vote(
    team_id: int,
    review_id: int,
    body: schemas.CastVoteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    team = _get_team_or_404(team_id, db)
    membership = _require_member(team, current_user, db)

    if membership.role not in (models.TeamRole.board, models.TeamRole.owner):
        raise HTTPException(status_code=403, detail="Only board members or owners can vote")

    if body.vote not in ("approve", "reject"):
        raise HTTPException(status_code=422, detail="Vote must be 'approve' or 'reject'")

    review = db.query(models.ConfigReview).filter(
        models.ConfigReview.id == review_id,
        models.ConfigReview.team_id == team_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.status != models.ReviewStatus.pending:
        raise HTTPException(status_code=409, detail="Review is already closed")

    # Upsert vote
    existing_vote = db.query(models.ReviewVote).filter(
        models.ReviewVote.review_id == review_id,
        models.ReviewVote.voter_id == current_user.id,
    ).first()

    if existing_vote:
        existing_vote.vote = models.VoteChoice(body.vote)
        existing_vote.comment = body.comment
    else:
        db.add(models.ReviewVote(
            review_id=review_id,
            voter_id=current_user.id,
            vote=models.VoteChoice(body.vote),
            comment=body.comment,
        ))
    db.flush()

    # Auto-approval: check if threshold is reached
    db.refresh(review)
    approve_count = sum(1 for v in review.votes if v.vote == models.VoteChoice.approve)
    if approve_count >= team.approval_threshold:
        review.status = models.ReviewStatus.approved

    db.commit()
    db.refresh(review)

    return _build_review_out(review)
