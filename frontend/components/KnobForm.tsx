"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type KnobRow = {
  name: string;
  min_val: number;
  max_val: number;
};

export default function KnobForm({
  rows,
  onChange,
}: {
  rows: KnobRow[];
  onChange: (rows: KnobRow[]) => void;
}) {
  function addRow() {
    onChange([...rows, { name: "", min_val: 0, max_val: 1 }]);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function update(i: number, field: keyof KnobRow, value: string | number) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <div className="grid grid-cols-[1fr_100px_100px_32px] gap-2 text-xs text-muted-foreground px-1">
          <span>Knob name</span><span>Min</span><span>Max</span><span />
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-center">
          <Input
            placeholder="e.g. clock_period"
            value={row.name}
            onChange={(e) => update(i, "name", e.target.value)}
            required
          />
          <Input
            type="number"
            step="any"
            value={row.min_val}
            onChange={(e) => update(i, "min_val", Number(e.target.value))}
            required
          />
          <Input
            type="number"
            step="any"
            value={row.max_val}
            onChange={(e) => update(i, "max_val", Number(e.target.value))}
            required
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>✕</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={addRow}>
        + Add knob
      </Button>
    </div>
  );
}
