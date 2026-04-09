"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "prizechips_onboarded";

const STEPS = [
  {
    title: "What are knobs?",
    subtitle: "These are the dials the AI will tune to find the best chip design.",
    items: [
      {
        term: "Clock Period",
        icon: "⚡",
        desc: "How fast the chip runs — a shorter period means a faster chip, but it's harder to achieve.",
      },
      {
        term: "Utilization",
        icon: "📦",
        desc: "How tightly packed the logic is — higher means more is crammed in, but it uses more power.",
      },
    ],
    note: "You can add any parameter the tool supports — these two are great defaults to start with.",
  },
  {
    title: "Reading the results",
    subtitle: "After the AI runs, you'll see four numbers. Here's what they mean:",
    items: [
      {
        term: "WNS",
        icon: "🕐",
        desc: "Worst Negative Slack — how close to the speed target. Positive means you hit it; negative means you missed.",
      },
      {
        term: "TNS",
        icon: "📉",
        desc: "Total Negative Slack — adds up all the timing misses. Zero is perfect; any negative number means timing isn't fully met.",
      },
      {
        term: "Power",
        icon: "🔋",
        desc: "How much electricity the chip uses (in milliwatts). Lower is usually better — less heat, longer battery life.",
      },
      {
        term: "Area",
        icon: "📐",
        desc: "How much physical space the chip takes up (in square micrometers). Smaller chips are cheaper to make.",
      },
    ],
    note: null,
  },
];

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/10">
              {/* Step dots */}
              <div className="flex gap-2 mb-6">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-emerald-400"
                        : i < step
                        ? "w-3 bg-emerald-400/50"
                        : "w-3 bg-white/15"
                    }`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-bold mb-1">{current.title}</h2>
                  <p className="text-sm text-muted-foreground mb-6">{current.subtitle}</p>

                  <div className="flex flex-col gap-4 mb-6">
                    {current.items.map((item) => (
                      <div key={item.term} className="flex gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                        <div>
                          <p className="text-sm font-semibold mb-0.5">{item.term}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {current.note && (
                    <p className="text-xs text-muted-foreground/70 italic border-l-2 border-white/15 pl-3 mb-6">
                      {current.note}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Footer buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={dismiss}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => (isLast ? dismiss() : setStep(step + 1))}
                  className="px-5 py-2 rounded-lg font-semibold text-sm text-white
                    bg-linear-to-r from-emerald-500 to-purple-500
                    hover:from-emerald-400 hover:to-purple-400
                    transition-all duration-200"
                >
                  {isLast ? "Got it!" : "Next →"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
