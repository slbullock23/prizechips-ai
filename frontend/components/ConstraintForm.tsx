"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ConstraintRow = {
  metric: "power" | "timing" | "area";
  min_val: number | null;
  max_val: number | null;
};

const METRICS = ["power", "timing", "area"] as const;

export default function ConstraintForm({
  rows,
  onChange,
}: {
  rows: ConstraintRow[];
  onChange: (rows: ConstraintRow[]) => void;
}) {
  function addRow() {
    onChange([...rows, { metric: "timing", min_val: null, max_val: null }]);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function update(i: number, field: keyof ConstraintRow, value: unknown) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={row.metric}
            onChange={(e) => update(i, "metric", e.target.value)}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="min"
            className="w-24"
            value={row.min_val ?? ""}
            onChange={(e) => update(i, "min_val", e.target.value === "" ? null : Number(e.target.value))}
          />
          <Input
            type="number"
            placeholder="max"
            className="w-24"
            value={row.max_val ?? ""}
            onChange={(e) => update(i, "max_val", e.target.value === "" ? null : Number(e.target.value))}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>✕</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={addRow}>
        + Add constraint
      </Button>
    </div>
  );
}
