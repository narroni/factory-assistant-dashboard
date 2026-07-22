"use client";

import { useTranslation } from "../hooks/useTranslation";

interface DeleteConfirmProps {
  title?: string;
  itemName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirm({
  title = "Delete Item",
  itemName,
  onConfirm,
  onClose,
}: DeleteConfirmProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-red-950 border border-red-900 mb-4">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-red-400"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">{title}</h3>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          {t("delete.message")}
          <span className="text-zinc-200 font-medium">{itemName}</span>
          {t("delete.message_end")}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            {t("delete.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            {t("delete.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
