from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from models import MetricType, RunStatus, ResultStatus


# ── Auth ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Constraints ───────────────────────────────────────────────────────────────

class ConstraintCreate(BaseModel):
    metric: MetricType
    min_val: Optional[float] = None
    max_val: Optional[float] = None


class ConstraintOut(ConstraintCreate):
    id: int

    model_config = {"from_attributes": True}


# ── Runs ──────────────────────────────────────────────────────────────────────

class RunCreate(BaseModel):
    name: str
    description: Optional[str] = None
    max_iterations: int = 10
    constraints: list[ConstraintCreate] = []


class RunOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: RunStatus
    max_iterations: int
    created_at: datetime
    updated_at: datetime
    constraints: list[ConstraintOut] = []
    knob_specs: Optional[list[dict]] = None

    model_config = {"from_attributes": True}


class RunSummary(BaseModel):
    id: int
    name: str
    status: RunStatus
    max_iterations: int
    created_at: datetime
    summary: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Results ───────────────────────────────────────────────────────────────────

class ResultOut(BaseModel):
    id: int
    configuration_id: int
    wns: Optional[float]
    tns: Optional[float]
    power: Optional[float]
    area: Optional[float]
    status: ResultStatus
    ai_explanation: Optional[str]
    engine_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Optimization ──────────────────────────────────────────────────────────────

class KnobDefinition(BaseModel):
    name: str
    min_val: float
    max_val: float


class OptimizeRequest(BaseModel):
    knobs: list[KnobDefinition]


class ConfigurationOut(BaseModel):
    id: int
    iteration: int
    knobs: dict
    result: Optional[ResultOut] = None

    model_config = {"from_attributes": True}


# ── What-If Predictions ───────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    knobs: dict[str, float]


class MetricPrediction(BaseModel):
    mean: float
    std: float


class PredictionResponse(BaseModel):
    wns: MetricPrediction
    power: MetricPrediction
    area: MetricPrediction
    data_points: int
    engine: str = "surrogate_gp"


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminLogin(BaseModel):
    username: str
    password: str


class UserAdminOut(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime
    run_count: int

    model_config = {"from_attributes": True}


class RunWithOwner(BaseModel):
    id: int
    name: str
    status: RunStatus
    max_iterations: int
    created_at: datetime
    owner_username: str
    summary: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Teams ─────────────────────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    approval_threshold: int = Field(default=1, ge=1)


class TeamOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    invite_code: str
    approval_threshold: int
    created_at: datetime
    member_count: int
    pending_review_count: int
    my_role: Optional[str]

    model_config = {"from_attributes": True}


class TeamMemberOut(BaseModel):
    user_id: int
    username: str
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class TeamDetailOut(BaseModel):
    team: TeamOut
    members: list[TeamMemberOut]


class JoinTeamRequest(BaseModel):
    invite_code: str


class ChangeRoleRequest(BaseModel):
    role: str  # "owner" | "member" | "board"


# ── Reviews ───────────────────────────────────────────────────────────────────

class SubmitReviewRequest(BaseModel):
    configuration_id: int


class ConfigReviewOut(BaseModel):
    id: int
    configuration_id: int
    team_id: int
    submitted_by: str
    status: str
    submitted_at: datetime
    vote_count: int
    approve_count: int
    run_name: str
    iteration: int

    model_config = {"from_attributes": True}


class ReviewVoteOut(BaseModel):
    voter_username: str
    vote: str
    comment: Optional[str]
    voted_at: datetime

    model_config = {"from_attributes": True}


class ReviewDetailOut(BaseModel):
    review: ConfigReviewOut
    votes: list[ReviewVoteOut]


class CastVoteRequest(BaseModel):
    vote: str  # "approve" | "reject"
    comment: Optional[str] = None
