from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Enum, Text, UniqueConstraint
from sqlalchemy.orm import relationship
import enum

from database import Base


# ── Existing enums ────────────────────────────────────────────────────────────

class RunStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class MetricType(str, enum.Enum):
    power = "power"
    timing = "timing"
    area = "area"


class ResultStatus(str, enum.Enum):
    success = "success"
    failed = "failed"
    skipped = "skipped"


# ── New enums for teams / reviews ─────────────────────────────────────────────

class TeamRole(str, enum.Enum):
    owner = "owner"
    member = "member"
    board = "board"


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class VoteChoice(str, enum.Enum):
    approve = "approve"
    reject = "reject"


# ── Existing models ───────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    runs = relationship("Run", back_populates="owner")
    team_memberships = relationship("TeamMembership", back_populates="user")


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    knob_specs = Column(JSON, nullable=True)  # [{name, min_val, max_val}]
    status = Column(Enum(RunStatus), default=RunStatus.pending)
    max_iterations = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="runs")
    constraints = relationship("Constraint", back_populates="run", cascade="all, delete-orphan")
    configurations = relationship("Configuration", back_populates="run", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="run", cascade="all, delete-orphan")


class Constraint(Base):
    __tablename__ = "constraints"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    metric = Column(Enum(MetricType), nullable=False)
    min_val = Column(Float, nullable=True)
    max_val = Column(Float, nullable=True)

    run = relationship("Run", back_populates="constraints")


class Configuration(Base):
    __tablename__ = "configurations"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    iteration = Column(Integer, nullable=False)
    knobs = Column(JSON, nullable=False)  # {"clock_period": 2.5, "utilization": 0.6, ...}
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="configurations")
    result = relationship("Result", back_populates="configuration", uselist=False)
    reviews = relationship("ConfigReview", back_populates="configuration")


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    configuration_id = Column(Integer, ForeignKey("configurations.id"), nullable=False)
    wns = Column(Float, nullable=True)   # Worst Negative Slack
    tns = Column(Float, nullable=True)   # Total Negative Slack
    power = Column(Float, nullable=True)
    area = Column(Float, nullable=True)
    status = Column(Enum(ResultStatus), default=ResultStatus.success)
    ai_explanation = Column(Text, nullable=True)
    engine_name = Column(String, nullable=True)   # "OpenROAD" | "Simulated"
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="results")
    configuration = relationship("Configuration", back_populates="result")


# ── Team models ───────────────────────────────────────────────────────────────

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    invite_code = Column(String(8), unique=True, index=True, nullable=False)
    approval_threshold = Column(Integer, default=1, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by_id])
    memberships = relationship("TeamMembership", back_populates="team", cascade="all, delete-orphan")
    reviews = relationship("ConfigReview", back_populates="team", cascade="all, delete-orphan")


class TeamMembership(Base):
    __tablename__ = "team_memberships"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(TeamRole), default=TeamRole.member, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="memberships")
    user = relationship("User", back_populates="team_memberships")

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_user"),
    )


class ConfigReview(Base):
    __tablename__ = "config_reviews"

    id = Column(Integer, primary_key=True, index=True)
    configuration_id = Column(Integer, ForeignKey("configurations.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.pending, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="reviews")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    configuration = relationship("Configuration", back_populates="reviews")
    votes = relationship("ReviewVote", back_populates="review", cascade="all, delete-orphan")


class ReviewVote(Base):
    __tablename__ = "review_votes"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("config_reviews.id"), nullable=False)
    voter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vote = Column(Enum(VoteChoice), nullable=False)
    comment = Column(Text, nullable=True)
    voted_at = Column(DateTime, default=datetime.utcnow)

    review = relationship("ConfigReview", back_populates="votes")
    voter = relationship("User", foreign_keys=[voter_id])

    __table_args__ = (
        UniqueConstraint("review_id", "voter_id", name="uq_review_voter"),
    )
