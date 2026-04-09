"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, KnobSpec, PredictionResponse } from "@/lib/api";
import { motion } from "framer-motion";

interface WhatIfPanelProps {
  runId: number;
  knobSpecs: KnobSpec[];
  currentKnobs: Record<string, number>;
}

function PredCard({
  label,
  unit,
  value,
  std,
  color,
  loading,
}: {
  label: string;
  unit: string;
  value: number | null;
  std: number | null;
  color: string;
  loading: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 ${color}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {loading || value === null ? (
        <div className="h-6 w-24 rounded-md bg-white/10 animate-pulse" />
      ) : (
        <p className="text-base font-bold font-mono">
          {value.toFixed(label === "Area" ? 0 : 3)}
          <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
      )}
      {!loading && std !== null && (
        <p className="text-xs text-muted-foreground mt-0.5">
          ± {std.toFixed(label === "Area" ? 0 : 3)} {unit}
        </p>
      )}
    </div>
  );
}

export default function WhatIfPanel({ runId, knobSpecs, currentKnobs }: WhatIfPanelProps) {
  const [knobs, setKnobs] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const spec of knobSpecs) {
      init[spec.name] = currentKnobs[spec.name] ?? (spec.min_val + spec.max_val) / 2;
    }
    return init;
  });
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPrediction = useCallback(
    (values: Record<string, number>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await api.predict(runId, values);
          setPrediction(res);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Prediction failed");
        } finally {
          setLoading(false);
        }
      }, 400);
    },
    [runId]
  );

  // Fetch on mount with current knob values
  useEffect(() => {
    fetchPrediction(knobs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSlider(name: string, value: number) {
    const next = { ...knobs, [name]: value };
    setKnobs(next);
    fetchPrediction(next);
  }

  const wnsPositive = prediction && prediction.wns.mean >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">🔮</span>
        <div>
          <h3 className="text-sm font-semibold">What-If Predictions</h3>
          <p className="text-xs text-muted-foreground">
            Drag the sliders to predict outcomes without running a new simulation
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-5 mb-6">
        {knobSpecs.map((spec) => {
          const val = knobs[spec.name] ?? spec.min_val;
          const pct = ((val - spec.min_val) / (spec.max_val - spec.min_val)) * 100;
          return (
            <div key={spec.name}>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-xs font-medium capitalize">
                  {spec.name.replace(/_/g, " ")}
                </label>
                <span className="text-xs font-mono text-muted-foreground">
                  {val.toFixed(3)}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min={spec.min_val}
                  max={spec.max_val}
                  step={(spec.max_val - spec.min_val) / 200}
                  value={val}
                  onChange={(e) => handleSlider(spec.name, parseFloat(e.target.value))}
                  className="w-full h-1.5 appearance-none rounded-full cursor-pointer
                    bg-white/10 accent-emerald-400"
                />
                {/* Progress fill */}
                <div
                  className="pointer-events-none absolute top-0 left-0 h-1.5 rounded-full bg-linear-to-r from-emerald-500 to-purple-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-0.5">
                <span>{spec.min_val}</span>
                <span>{spec.max_val}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prediction cards */}
      <div className="grid grid-cols-3 gap-3">
        <PredCard
          label="WNS"
          unit="ns"
          value={prediction?.wns.mean ?? null}
          std={prediction?.wns.std ?? null}
          color={
            loading || !prediction
              ? "border-white/8"
              : wnsPositive
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5"
          }
          loading={loading}
        />
        <PredCard
          label="Power"
          unit="mW"
          value={prediction?.power.mean ?? null}
          std={prediction?.power.std ?? null}
          color="border-amber-500/20 bg-amber-500/5"
          loading={loading}
        />
        <PredCard
          label="Area"
          unit="μm²"
          value={prediction?.area.mean ?? null}
          std={prediction?.area.std ?? null}
          color="border-purple-500/20 bg-purple-500/5"
          loading={loading}
        />
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}

      {prediction && !error && (
        <p className="mt-3 text-[10px] text-muted-foreground/50 text-right">
          Surrogate GP · {prediction.data_points} data points
        </p>
      )}
    </motion.div>
  );
}
