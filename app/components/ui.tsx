"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "../hooks/useTranslation";

// ── Translated text (for use inside server components) ────────────────────────

export function T({ k }: { k: string }) {
  const { t } = useTranslation();
  return <>{t(k)}</>;
}

// ── Form field components ─────────────────────────────────────────────────────

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
      {children}
    </label>
  );
}

export const inputCls =
  "w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  hint,
  min,
  max,
  step = "any",
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  // The raw input string is held locally so intermediate states survive typing.
  // Deriving the displayed value straight from the number made "0" erase itself
  // (0 rendered as "") and stripped the decimal point mid-keystroke, because
  // parseFloat("1.") is 1 and re-rendering replaced "1." with "1".
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));

  // Resync when the parent changes the value externally (e.g. the form is
  // reopened on a different record). Uses React's "adjust state during render"
  // pattern rather than an effect: no extra commit, and typing is never
  // interrupted because the text is only replaced when it does not already
  // parse to the incoming number.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    const parsed = parseFloat(raw);
    if (parsed !== value && !(value === 0 && raw === "")) {
      setRaw(value === 0 ? "" : String(value));
    }
  }

  return (
    <div>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={raw}
        onChange={(e) => {
          const next = e.target.value;
          setRaw(next);
          const parsed = parseFloat(next);
          if (!isNaN(parsed)) onChange(parsed);
          else if (next === "" || next === "-") onChange(0);
        }}
        onBlur={() => {
          const parsed = parseFloat(raw);
          if (isNaN(parsed)) {
            setRaw("");
            onChange(0);
          } else {
            setRaw(String(parsed));
            onChange(parsed);
          }
        }}
        placeholder={placeholder ?? "0"}
        className={inputCls}
      />
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  labels?: { [key: string]: string };
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      {options.map((o) => (
        <option key={o} value={o}>{labels?.[o] ?? o}</option>
      ))}
    </select>
  );
}

// ── Inline status dropdown (for table rows) ───────────────────────────────────

export function InlineStatusSelect<T extends string>({
  value,
  options,
  styles,
  onChange,
  labels,
}: {
  value: T;
  options: readonly T[];
  styles: { [key: string]: string };
  onChange: (v: T) => void;
  labels?: { [key: string]: string };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${
          styles[value] ?? "bg-zinc-800 text-zinc-400 border border-zinc-700"
        }`}
      >
        {labels?.[value] ?? value}
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="opacity-60"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden min-w-max py-1">
          {options.map((o) => (
            <button
              key={o}
              onClick={(e) => { e.stopPropagation(); onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${o === value ? "bg-blue-400" : "bg-zinc-700"}`}
              />
              {labels?.[o] ?? o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toolbar components ────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-72">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
      />
    </div>
  );
}

export function AddButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
  );
}

// ── Table row action buttons ───────────────────────────────────────────────────

export function EditButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs text-zinc-500 hover:text-zinc-200 px-2.5 py-1 rounded-md hover:bg-zinc-700 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {t("action.edit")}
    </button>
  );
}

export function DeleteButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs text-red-500 hover:text-red-400 px-2.5 py-1 rounded-md hover:bg-zinc-700 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {t("action.delete")}
    </button>
  );
}
