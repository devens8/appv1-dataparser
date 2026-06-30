"use client";

import { useEffect, useRef, useState } from "react";
import { IconClose } from "@/components/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export default function NewWorkspaceModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="surface animate-scale-in glow relative w-full max-w-md rounded-2xl p-6">
        <div className="hairline-accent absolute inset-x-6 top-0 h-px" />
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              New workspace
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              A workspace holds your datasets and analyses, like a document.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          >
            <IconClose className="h-4 w-4" width={16} height={16} />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-slate-400">
          Name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. Assay batch 2026-06"
          className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />

        <label className="mb-1 mt-4 block text-xs font-medium text-slate-400">
          Description <span className="text-slate-600">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this workspace for?"
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-lg bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_-8px_rgba(56,189,248,0.9)] transition-all hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
          >
            Create workspace
          </button>
        </div>
      </div>
    </div>
  );
}
