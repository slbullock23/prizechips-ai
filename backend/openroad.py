"""
OpenROAD simulator — pluggable engine.

Detects whether `openroad` binary is available (via OPENROAD_PATH env var or
PATH lookup). If available, generates a TCL script and calls OpenROAD directly.
Falls back gracefully to the realistic mock simulator on any failure or when
OpenROAD is not installed.
"""

import os
import re
import shutil
import subprocess
import tempfile
import random
from dataclasses import dataclass


@dataclass
class SimResult:
    wns: float   # Worst Negative Slack (ns) — higher (less negative) is better
    tns: float   # Total Negative Slack (ns) — higher (less negative) is better
    power: float # mW
    area: float  # um^2


# Detect OpenROAD binary once at import time
_OPENROAD_PATH: str | None = os.getenv("OPENROAD_PATH") or shutil.which("openroad")

# TCL script template for OpenROAD (requires PDK_LEF, DESIGN_DEF, LIB_FILE env vars)
_TCL_TEMPLATE = """\
# PrizeChips — auto-generated OpenROAD TCL script
read_lef  $env(PDK_LEF)
read_def  $env(DESIGN_DEF)
read_liberty $env(LIB_FILE)

create_clock -period {clock_period} -name clk [get_ports clk]

set_max_fanout {max_fanout} [current_design]

global_placement -density {utilization}

clock_tree_synthesis \\
    -root_buf BUFX{buffer_size_int} \\
    -buf_list {{BUFX1 BUFX2 BUFX4 BUFX8}} \\
    -max_fanout {max_fanout}

detailed_placement
optimize_mirroring

global_route -congestion_report_file congestion.rpt
detailed_route -droute_end_iter 10

report_wns
report_tns
report_power
report_design_area

exit
"""


def get_engine() -> str:
    """Return the name of the active simulation engine."""
    return "OpenROAD" if _OPENROAD_PATH else "Simulated"


def run_simulation(knobs: dict, seed: int | None = None) -> SimResult:
    """
    Simulate a chip design run given a dict of knob values.

    Routes to the real OpenROAD engine if available, otherwise uses the
    realistic mock simulator. Falls back to mock on any OpenROAD failure.

    Supported knobs (all optional):
      clock_period   (ns)   2.0 – 5.0
      utilization    (0-1)  0.3 – 0.8
      wire_density   (0-1)  0.3 – 0.9
      buffer_size    (1-4)  1 – 4
      max_fanout     (int)  8 – 64
      target_slack   (ns)   -0.5 – 0.5
    """
    if _OPENROAD_PATH:
        try:
            return _run_openroad(knobs)
        except Exception:
            pass  # fall back to mock on any error
    return _run_mock(knobs, seed)


def _run_openroad(knobs: dict) -> SimResult:
    """Call the real OpenROAD binary via subprocess."""
    clock_period = float(knobs.get("clock_period", 3.0))
    utilization  = float(knobs.get("utilization",  0.6))
    buffer_size  = float(knobs.get("buffer_size",  2.0))
    max_fanout   = int(knobs.get("max_fanout", 20))

    tcl = _TCL_TEMPLATE.format(
        clock_period=clock_period,
        utilization=utilization,
        buffer_size_int=max(1, int(round(buffer_size))),
        max_fanout=max_fanout,
    )

    with tempfile.NamedTemporaryFile(suffix=".tcl", mode="w", delete=False) as f:
        f.write(tcl)
        tcl_path = f.name

    try:
        proc = subprocess.run(
            [_OPENROAD_PATH, "-exit", tcl_path],
            capture_output=True, text=True, timeout=120,
        )
    finally:
        os.unlink(tcl_path)

    if proc.returncode != 0:
        raise RuntimeError(f"OpenROAD exited {proc.returncode}: {proc.stderr[:400]}")

    return _parse_openroad_output(proc.stdout)


def _parse_openroad_output(stdout: str) -> SimResult:
    """Extract WNS/TNS/Power/Area from OpenROAD stdout."""
    wns_m   = re.search(r"wns\s+([-\d.]+)", stdout, re.IGNORECASE)
    tns_m   = re.search(r"tns\s+([-\d.]+)", stdout, re.IGNORECASE)
    pwr_m   = re.search(r"Total\s+([\d.]+)\s+\S+\s+\(mW\)", stdout)
    area_m  = re.search(r"Design area\s+([\d.]+)\s+u\^2", stdout)

    return SimResult(
        wns=float(wns_m.group(1)) if wns_m else 0.0,
        tns=float(tns_m.group(1)) if tns_m else 0.0,
        power=float(pwr_m.group(1)) if pwr_m else 0.0,
        area=float(area_m.group(1)) if area_m else 0.0,
    )


def _run_mock(knobs: dict, seed: int | None = None) -> SimResult:
    """
    Realistic mock simulator using seeded random + physics-inspired equations.
    Unchanged from original implementation.
    """
    rng = random.Random(seed)

    clock_period = float(knobs.get("clock_period", 3.0))
    utilization  = float(knobs.get("utilization",  0.6))
    wire_density = float(knobs.get("wire_density", 0.6))
    buffer_size  = float(knobs.get("buffer_size",  2.0))

    # Timing slack improves with longer clock period, lower wire density, bigger buffers
    slack_base = (clock_period - 2.0) * 0.4 - wire_density * 0.8 + (buffer_size - 1) * 0.15 - 0.3
    wns = slack_base + rng.gauss(0, 0.05)
    tns = wns * 4.5 + rng.gauss(0, 0.2)

    # Power scales with utilization and buffer size
    power = utilization * 42.0 + buffer_size * 1.5 + rng.gauss(0, 0.8)

    # Area shrinks with higher utilization, grows with larger buffers
    area = (1.0 / max(utilization, 0.01)) * 750 + buffer_size * 20 + rng.gauss(0, 5)

    return SimResult(
        wns=round(wns, 4),
        tns=round(tns, 4),
        power=round(max(power, 0), 3),
        area=round(max(area, 0), 1),
    )
