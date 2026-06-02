"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth-helpers";
import AccessDenied from "../../../components/AccessDenied";

type KnowledgeFile = {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  content: string;
  enabled: boolean;
  uploadedBy: string;
  user: { name: string };
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export default function AIKnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [authState, setAuthState] = useState<"checking" | "ok" | "denied">("checking");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace("/login"); return; }
      if (u.role !== "ADMIN") { setAuthState("denied"); return; }
      setAuthState("ok");
      loadFiles();
    });
  }, [router]);

  if (authState === "checking") return null;
  if (authState === "denied") return <AccessDenied />;

  async function loadFiles() {
    try {
      const data = await (await fetch("/api/admin/knowledge")).json();
      setFiles(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "csv", "xlsx", "pdf"].includes(ext ?? "")) {
      setMessage("Only TXT, CSV, XLSX, and PDF files are supported.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/knowledge", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setFiles((prev) => [data, ...prev]);
        setMessage(`Uploaded: ${file.name}`);
        setTimeout(() => setMessage(""), 3000);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setMessage(data.error ?? "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  }

  async function toggleEnabled(id: string, currentEnabled: boolean) {
    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const updated = await res.json();
      setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (err) {
      setMessage("Failed to toggle file");
    }
  }

  async function deleteFile(id: string) {
    if (!confirm("Delete this knowledge file?")) return;
    try {
      await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setMessage("Failed to delete file");
    }
  }

  return (
    <div className="px-8 py-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Factory Knowledge Base</h1>
        <p className="text-xs text-zinc-500 mt-1">Upload documents to augment the AI with custom factory knowledge.</p>
      </div>

      {/* Upload Area */}
      <div className="bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-700 p-8">
        <label className="cursor-pointer block">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.xlsx,.pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-300">
                {uploading ? "Uploading…" : "Click to upload or drag files"}
              </p>
              <p className="text-xs text-zinc-600">TXT, CSV, XLSX, or PDF (max 10MB each)</p>
            </div>
          </div>
        </label>
      </div>

      {message && (
        <div
          className={`text-xs px-4 py-3 rounded-lg border ${
            message.includes("Upload") || message.includes("Uploaded")
              ? "bg-emerald-950 border-emerald-900 text-emerald-400"
              : "bg-red-950 border-red-900 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* Files List */}
      {loading ? (
        <div className="text-xs text-zinc-500">Loading…</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">No knowledge files uploaded yet.</p>
          <p className="text-xs text-zinc-600 mt-1">Start by uploading a factory knowledge document.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                <th className="px-5 py-3 font-medium">File</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">Uploaded By</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => (
                <tr key={file.id} className={`${i < files.length - 1 ? "border-b border-zinc-800" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="text-xs font-medium text-zinc-200 truncate">{file.filename}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{file.content.length} chars</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">{file.fileType.toUpperCase()}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-400">{Math.round(file.fileSize / 1024)} KB</td>
                  <td className="px-5 py-3 text-xs text-zinc-400">{file.user.name}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleEnabled(file.id, file.enabled)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        file.enabled
                          ? "bg-emerald-950 border-emerald-900 text-emerald-400"
                          : "bg-zinc-800 border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {file.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right flex items-center justify-end gap-2">
                    {file.fileType === "xlsx" && (
                      <button
                        onClick={() => setPreviewId(previewId === file.id ? null : file.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {previewId === file.id ? "Hide" : "Preview"}
                      </button>
                    )}
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* XLSX Preview Modal */}
          {previewId && (
            <>
              <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setPreviewId(null)} />
              <div className="fixed inset-4 z-50 flex flex-col bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                  <h2 className="text-sm font-semibold text-zinc-100">
                    {files.find((f) => f.id === previewId)?.filename} — Parsed Preview
                  </h2>
                  <button
                    onClick={() => setPreviewId(null)}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono p-6">
                    {files.find((f) => f.id === previewId)?.content}
                  </pre>
                </div>
                <div className="px-6 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Extracted from{" "}
                    {files.find((f) => f.id === previewId)?.metadata
                      ? ((files.find((f) => f.id === previewId)?.metadata as Record<string, unknown>)
                          .totalRows as number) ?? "unknown"
                      : "0"}{" "}
                    rows
                  </span>
                  <button
                    onClick={() => setPreviewId(null)}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4 space-y-2">
        <p className="text-xs font-medium text-blue-400">💡 Tips</p>
        <ul className="text-xs text-blue-300 space-y-1 list-inside list-disc">
          <li>Text files are extracted immediately and included in the AI context</li>
          <li>Enable/disable files to control what knowledge the AI has access to</li>
          <li>The AI won't execute actions automatically — humans must approve in AI Requests</li>
          <li>Knowledge is supplemental; core factory data is always available</li>
        </ul>
      </div>
    </div>
  );
}
