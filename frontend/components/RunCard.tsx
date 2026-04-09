import { RunSummary } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  running:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  failed:    "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function RunCard({
  run,
  onClick,
  compareMode = false,
  selected = false,
  onSelect,
}: {
  run: RunSummary;
  onClick: () => void;
  compareMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}) {
  function handleClick() {
    if (compareMode && onSelect) {
      onSelect(run.id);
    } else {
      onClick();
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`glass rounded-xl p-5 cursor-pointer transition-colors relative ${
        selected
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "hover:border-emerald-500/30"
      }`}
      onClick={handleClick}
    >
      {compareMode && (
        <div
          className={`absolute top-3 right-3 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
            selected
              ? "bg-emerald-500 border-emerald-500"
              : "border-white/20 bg-white/5"
          }`}
        >
          {selected && (
            <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-white">
              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="font-semibold text-sm leading-tight">{run.name}</p>
        {!compareMode && (
          <Badge className={`${STATUS_STYLES[run.status]} border text-xs shrink-0`}>{run.status}</Badge>
        )}
      </div>

      {run.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {run.summary}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {run.status === "running" && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
        <span>{run.max_iterations} iterations</span>
        <span className="opacity-30">·</span>
        <span>{new Date(run.created_at).toLocaleDateString()}</span>
      </div>
    </motion.div>
  );
}
