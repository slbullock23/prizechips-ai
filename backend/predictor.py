"""
Surrogate model predictions for What-If analysis.

Fits three independent Gaussian Process regressors (one each for WNS, Power,
Area) from the stored optimization results, then predicts with uncertainty
for arbitrary knob values within the search space.

Results are cached in memory per run_id. Cache is invalidated whenever new
configurations arrive (checked via result count).
"""

from __future__ import annotations

import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern, WhiteKernel
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

import models


# ── In-memory cache ───────────────────────────────────────────────────────────
# run_id -> (knob_names, scaler, gp_wns, gp_power, gp_area, n_points)
_cache: dict[int, tuple] = {}


def _fit(run_id: int, db: Session) -> tuple:
    """Fetch stored results and fit three GP regressors."""
    configs = (
        db.query(models.Configuration)
        .filter(models.Configuration.run_id == run_id)
        .order_by(models.Configuration.iteration)
        .all()
    )

    rows = []
    for cfg in configs:
        r = cfg.result
        if r and r.wns is not None and r.power is not None and r.area is not None:
            rows.append((cfg.knobs, r.wns, r.power, r.area))

    if len(rows) < 3:
        raise ValueError(f"Need at least 3 completed results; got {len(rows)}")

    # Determine knob order from the first row
    knob_names = list(rows[0][0].keys())

    X = np.array([[row[0][n] for n in knob_names] for row in rows])
    y_wns   = np.array([row[1] for row in rows])
    y_power = np.array([row[2] for row in rows])
    y_area  = np.array([row[3] for row in rows])

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kernel = Matern(nu=2.5) + WhiteKernel(noise_level=1e-3)

    def _fit_gp(y: np.ndarray) -> GaussianProcessRegressor:
        gp = GaussianProcessRegressor(
            kernel=kernel,
            n_restarts_optimizer=5,
            normalize_y=True,
            random_state=42,
        )
        gp.fit(X_scaled, y)
        return gp

    gp_wns   = _fit_gp(y_wns)
    gp_power = _fit_gp(y_power)
    gp_area  = _fit_gp(y_area)

    return (knob_names, scaler, gp_wns, gp_power, gp_area, len(rows))


def predict(run_id: int, knob_values: dict[str, float], db: Session) -> dict:
    """
    Predict WNS, Power, and Area for a given set of knob values using the
    surrogate GP model trained on this run's optimization history.

    Returns a dict with keys: wns, power, area (each with mean and std),
    plus data_points (number of results used to fit the model).

    Raises ValueError if not enough data points are available.
    """
    # Fetch current result count to detect stale cache
    n_results = (
        db.query(models.Result)
        .filter(
            models.Result.run_id == run_id,
            models.Result.wns.isnot(None),
        )
        .count()
    )

    cached = _cache.get(run_id)
    if cached is None or cached[5] != n_results:
        _cache[run_id] = _fit(run_id, db)
        cached = _cache[run_id]

    knob_names, scaler, gp_wns, gp_power, gp_area, n_points = cached

    # Build input vector in the same knob order used during fitting
    x_raw = np.array([[knob_values.get(n, 0.0) for n in knob_names]])
    x_scaled = scaler.transform(x_raw)

    wns_mean,   wns_std   = gp_wns.predict(x_scaled,   return_std=True)
    power_mean, power_std = gp_power.predict(x_scaled, return_std=True)
    area_mean,  area_std  = gp_area.predict(x_scaled,  return_std=True)

    return {
        "wns":   {"mean": float(wns_mean[0]),   "std": float(wns_std[0])},
        "power": {"mean": float(power_mean[0]), "std": float(power_std[0])},
        "area":  {"mean": float(area_mean[0]),  "std": float(area_std[0])},
        "data_points": n_points,
        "engine": "surrogate_gp",
    }
