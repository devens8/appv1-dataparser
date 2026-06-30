"use client";

import { useState } from "react";
import { useFeedbackStore } from "@/store/feedback";
import { useSessionStore } from "@/store/session";
import { relativeTime } from "@/lib/format";
import { IconClose, IconStar, IconTrash } from "@/components/icons";

const CATEGORIES = [
  "General",
  "Analysis tools",
  "Charts",
  "Import / parsing",
  "Performance",
  "Bug report",
  "Feature request",
];

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const name = useSessionStore((s) => s.name);
  const entries = useFeedbackStore((s) => s.entries);
  const addFeedback = useFeedbackStore((s) => s.addFeedback);
  const removeFeedback = useFeedbackStore((s) => s.removeFeedback);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");

  const canSubmit = rating > 0 && message.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    addFeedback({ rating, category, message: message.trim(), author: name });
    setRating(0);
    setMessage("");
    setCategory(CATEGORIES[0]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface glow animate-fade-in flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line/80 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-fg">
              Share feedback
            </h2>
            <p className="text-[11px] text-fgmuted">
              Help shape Strata — stored locally on this device.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1.5 text-fgsubtle hover:bg-panel2/60 hover:text-fg"
          >
            <IconClose className="h-4 w-4" width={16} height={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
                Rating
              </span>
              <div className="mt-1.5 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  >
                    <IconStar
                      className={`h-6 w-6 ${
                        n <= (hover || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-fgsubtle"
                      }`}
                      width={24}
                      height={24}
                    />
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-sm border border-line bg-panel/80 px-3 py-1.5 text-sm text-fg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
                Message
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="What's working well? What could be better?"
                className="resize-none rounded-sm border border-line bg-panel/80 px-3 py-2 text-sm text-fg outline-none placeholder:text-fgsubtle focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </label>

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full rounded-sm border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:bg-panel2/60 disabled:text-fgsubtle"
            >
              Submit feedback
            </button>
          </div>

          {entries.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
                Previous feedback ({entries.length})
              </div>
              <div className="space-y-2">
                {entries.map((e) => (
                  <div
                    key={e.id}
                    className="group rounded-sm border border-line bg-panel/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <IconStar
                              key={n}
                              className={`h-3 w-3 ${
                                n <= e.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-fgsubtle"
                              }`}
                              width={12}
                              height={12}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-fgsubtle">
                          {e.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-fgsubtle">
                          {relativeTime(e.createdAt)}
                        </span>
                        <button
                          onClick={() => removeFeedback(e.id)}
                          className="rounded p-0.5 text-fgsubtle opacity-0 hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                        >
                          <IconTrash className="h-3.5 w-3.5" width={14} height={14} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-fgmuted">{e.message}</p>
                    <p className="mt-0.5 text-[10px] text-fgsubtle">
                      — {e.author}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
