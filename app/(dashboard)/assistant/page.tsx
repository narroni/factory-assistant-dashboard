"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../lib/auth-helpers";
import { useLanguage } from "../../contexts/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type Proposal = {
  actionType: string;
  payload: Record<string, unknown>;
  reasoning: string;
};

type AssistantApiResponse = {
  question: string;
  answer: string;
  ollamaUsed: boolean;
  fallbackReason?: string;
  proposals: Proposal[];
  savedRequestIds: string[];
  chatId?: string;
  respondedAt: string;
};

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  ollamaUsed?: boolean;
  proposals?: Proposal[];
  createdAt?: string;
  status?: "PENDING" | "COMPLETED" | "FAILED";
  // local-only
  loading?: boolean;
  respondedAt?: string;
  savedRequestIds?: string[];
};

type Chat = {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
  user?: { name: string; email: string };
};

// ── Diagnostics modal ─────────────────────────────────────────────────────────

type HealthData = {
  online: boolean;
  version: string | null;
  model: string;
  modelLoaded: boolean;
  models: string[];
  resolvedUrl: string;
  error: string | null;
};

type TestData = {
  ok: boolean;
  httpStatus: number | null;
  durationMs: number;
  content: string | null;
  error: string | null;
  model: string;
};

function DiagnosticsModal({ onClose }: { onClose: () => void }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try { setHealth(await (await fetch("/api/assistant/health")).json()); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { check(); }, [check]);

  async function runTest() {
    setTesting(true); setTest(null);
    try { setTest(await (await fetch("/api/assistant/test-ollama", { method: "POST" })).json()); }
    catch (e) { setTest({ ok: false, httpStatus: null, durationMs: 0, content: null, error: String(e), model: "" }); }
    finally { setTesting(false); }
  }

  const Bool = ({ v }: { v: boolean }) => (
    <span className={v ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>{v ? "Yes" : "No"}</span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-14 pr-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-96 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-sm font-semibold text-zinc-100">Ollama Diagnostics</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="px-4 py-4 space-y-3 text-xs">
          {loading && !health && <p className="text-zinc-500">Checking…</p>}
          {health && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between gap-3"><span className="text-zinc-500 shrink-0">Model</span><span className="font-mono text-zinc-300">{health.model}</span></div>
                <div className="flex justify-between gap-3"><span className="text-zinc-500 shrink-0">URL</span><span className="font-mono text-zinc-400 text-right truncate max-w-52">{health.resolvedUrl}</span></div>
                {health.version && <div className="flex justify-between"><span className="text-zinc-500">Ollama version</span><span className="text-zinc-400">{health.version}</span></div>}
                <div className="flex justify-between"><span className="text-zinc-500">Reachable</span><Bool v={health.online} /></div>
                <div className="flex justify-between"><span className="text-zinc-500">Model exists</span><Bool v={health.modelLoaded} /></div>
                {!health.modelLoaded && health.models.length > 0 && (
                  <div className="px-3 py-2 bg-amber-950/30 border border-amber-900/60 rounded-lg">
                    <p className="text-amber-400 mb-1">Model not found. Available:</p>
                    <p className="text-zinc-400">{health.models.join(", ")}</p>
                  </div>
                )}
                {health.error && <p className="text-red-400 px-3 py-2 bg-red-950/30 border border-red-900/60 rounded-lg break-all">{health.error}</p>}
              </div>
              <div className="border-t border-zinc-800 pt-3 flex gap-2">
                <button onClick={runTest} disabled={testing} className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                  {testing ? <><span className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin"/>Running…</> : "Test Generation"}
                </button>
                <button onClick={check} disabled={loading} className="text-blue-400 hover:text-blue-300 disabled:opacity-50 px-2 whitespace-nowrap">{loading ? "…" : "Reload"}</button>
              </div>
              {test && (
                <div className="bg-zinc-950 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between"><span className="text-zinc-500">Model</span><span className="text-zinc-400 font-mono">{test.model}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">HTTP</span><span className={test.httpStatus === 200 ? "text-emerald-400" : "text-red-400"}>{test.httpStatus ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Duration</span><span className="text-zinc-300">{test.durationMs}ms</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Response</span><span className={test.content === "OLLAMA OK" ? "text-emerald-400" : "text-amber-400"}>{test.content ?? test.error ?? "—"}</span></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Proposal card ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  create_order: "Create Order", create_purchase_request: "Purchase Request",
  update_stock: "Update Stock", assign_supplier: "Assign Supplier",
  generate_report: "Generate Report", export_data: "Export Data",
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:  { bg: "bg-zinc-800",       border: "border-zinc-700", text: "text-amber-400"  },
  APPROVED: { bg: "bg-blue-950/40",    border: "border-blue-900", text: "text-blue-400"   },
  REJECTED: { bg: "bg-zinc-800",       border: "border-zinc-700", text: "text-zinc-500"   },
  EXECUTED: { bg: "bg-emerald-950/40", border: "border-emerald-900", text: "text-emerald-400" },
};

type ExecutedActionInfo = {
  id: string;
  outputType: string;
  outputFile: string | null;
  outputContent: string | null;
  executedBy: string;
  executedAt: string;
};

function ProposalCard({
  proposal, requestId, isAdmin,
}: {
  proposal: Proposal;
  requestId?: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>("PENDING");
  const [executedAction, setExecutedAction] = useState<ExecutedActionInfo | null>(null);
  const [loading, setLoading] = useState(!!requestId);
  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await fetch("/api/ai-requests/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [requestId] }),
      });
      const data = await res.json();
      const entry = data.statuses?.[requestId];
      if (entry?.status) setStatus(entry.status);
      if (entry?.executedAction) setExecutedAction(entry.executedAction);
    } catch (e) {
      console.error("Failed to fetch request status:", e);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  async function handleExecute() {
    if (!requestId) return;
    setExecuting(true);
    setExecError(null);
    try {
      const res = await fetch(`/api/ai-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Execution failed");
      }
      await fetchStatus();
    } catch (e) {
      setExecError(e instanceof Error ? e.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  }

  async function handleApprove() {
    if (!requestId) return;
    try {
      const res = await fetch(`/api/ai-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error("Approval failed");
      await fetchStatus();
    } catch (e) {
      console.error("Approval failed:", e);
    }
  }

  async function handleReject() {
    if (!requestId) return;
    try {
      const res = await fetch(`/api/ai-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) throw new Error("Rejection failed");
      await fetchStatus();
    } catch (e) {
      console.error("Rejection failed:", e);
    }
  }

  function getStatusLabel(): string {
    if (loading) return "…";
    if (status === "PENDING") return isAdmin ? "Pending approval" : "Waiting for admin approval";
    if (status === "APPROVED") return "Approved";
    if (status === "REJECTED") return "Rejected";
    if (status === "EXECUTED") return "Executed";
    return status;
  }

  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;

  return (
    <div className={`border ${colors.border} ${colors.bg} rounded-lg p-3 space-y-2 mt-2`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-medium text-zinc-300">
          {ACTION_LABELS[proposal.actionType] ?? proposal.actionType}
        </span>
        {requestId && (
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors.text}`}>
              {getStatusLabel()}
            </span>
            <Link
              href={`/ai-requests?viewId=${requestId}`}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
              title="Open in AI Requests"
            >
              ↗
            </Link>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <p className="text-xs text-zinc-500 leading-relaxed">{proposal.reasoning}</p>

      {/* Actions: Approve/Reject (admin, PENDING) or Execute (admin, APPROVED) */}
      {requestId && isAdmin && (
        <div className="pt-1 space-y-2">
          {status === "PENDING" && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleApprove}
                className="flex-1 min-w-24 text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
              >
                Approve
              </button>
              <button
                onClick={handleReject}
                className="flex-1 min-w-24 text-xs px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
              >
                Reject
              </button>
            </div>
          )}
          {status === "APPROVED" && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-100 rounded-lg transition-colors font-medium"
            >
              {executing ? (
                <><span className="w-3 h-3 border border-zinc-300 border-t-transparent rounded-full animate-spin" /> Executing…</>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Execute
                </>
              )}
            </button>
          )}
          {execError && <p className="text-xs text-red-400">{execError}</p>}
        </div>
      )}

      {/* Output info — EXECUTED state */}
      {status === "EXECUTED" && executedAction && (
        <div className="pt-1 space-y-1 border-t border-zinc-700/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Executed by</span>
            <span className="text-xs text-zinc-300">{executedAction.executedBy}</span>
            <span className="text-xs text-zinc-600">{new Date(executedAction.executedAt).toLocaleTimeString()}</span>
          </div>
          {(executedAction.outputFile || executedAction.outputContent) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{executedAction.outputType}</span>
              <a
                href={`/api/outputs/${executedAction.id}/download`}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline"
                download
              >
                Download
              </a>
            </div>
          )}
        </div>
      )}

      {/* Payload toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
      >
        {open ? "Hide payload" : "Show payload"}
      </button>
      {open && (
        <pre className="text-xs text-zinc-500 bg-zinc-900/60 rounded p-2 overflow-x-auto">{JSON.stringify(proposal.payload, null, 2)}</pre>
      )}
    </div>
  );
}

// ── Message components ────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-lg bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm">{text}</div>
    </div>
  );
}

function AssistantBubble({ msg, onRetry, isAdmin }: { msg: ChatMessage; onRetry?: (msgId: string) => void; isAdmin: boolean }) {
  const isPending = msg.status === "PENDING";
  const isFailed = msg.status === "FAILED";

  if (isPending) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-zinc-300 shrink-0" style={{ fontSize: 10 }}>A</div>
          <span className="text-xs text-zinc-500">Assistant</span>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <div className="flex gap-1 px-3 py-2 bg-zinc-800 rounded-2xl rounded-tl-sm">
            {[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>)}
          </div>
          <span className="text-xs text-zinc-500">Generating response…</span>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-zinc-300 shrink-0" style={{ fontSize: 10 }}>A</div>
          <span className="text-xs text-zinc-500">Assistant</span>
        </div>
        <div className="pl-8 space-y-2">
          <div className="bg-red-950/30 border border-red-900/50 rounded p-3 space-y-2">
            <p className="text-xs text-red-400 font-medium">Failed to generate response</p>
            <p className="text-xs text-red-300">{msg.content || "An error occurred while generating the assistant response."}</p>
            {msg.id && onRetry && (
              <button
                onClick={() => onRetry(msg.id!)}
                className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-zinc-300 shrink-0" style={{ fontSize: 10 }}>A</div>
        <span className="text-xs text-zinc-500">Assistant</span>
      </div>
      <p className="text-sm text-zinc-200 leading-relaxed pl-8 whitespace-pre-line">{msg.content}</p>
      {msg.proposals && msg.proposals.length > 0 && (
        <div className="pl-8 space-y-2">
          {msg.proposals.map((p, i) => (
            <ProposalCard key={i} proposal={p} requestId={msg.savedRequestIds?.[i]} isAdmin={isAdmin} />
          ))}
          {msg.savedRequestIds && msg.savedRequestIds.length > 0 && !isAdmin && (
            <p className="text-xs text-zinc-600 pl-1">
              {msg.savedRequestIds.length} request{msg.savedRequestIds.length !== 1 ? "s" : ""} saved —
              <Link href="/ai-requests" className="text-zinc-500 hover:text-zinc-300 ml-1">View →</Link>
            </p>
          )}
        </div>
      )}
      {(msg.respondedAt || msg.createdAt) && (
        <p className="text-xs text-zinc-600 pl-8">{new Date(msg.respondedAt ?? msg.createdAt!).toLocaleTimeString()}</p>
      )}
    </div>
  );
}

// ── Chat sidebar ──────────────────────────────────────────────────────────────

function ChatSidebar({
  chats,
  activeChatId,
  onSelect,
  onNew,
  onDelete,
  onClose,
  isAdmin,
}: {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="w-64 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/80 h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chats</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onNew}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            title="New Chat"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5"
            title="Close chat history"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="px-4 py-6 text-xs text-zinc-600 text-center">No chats yet.</p>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b border-zinc-800/50 ${
                chat.id === activeChatId ? "bg-zinc-800" : "hover:bg-zinc-800/50"
              }`}
              onClick={() => onSelect(chat.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{chat.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isAdmin && chat.user && (
                    <span className="text-xs text-zinc-600 truncate max-w-28">{chat.user.name}</span>
                  )}
                  <span className="text-xs text-zinc-600">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                  {chat._count && <span className="text-xs text-zinc-600">· {chat._count.messages}</span>}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1 rounded shrink-0"
                title="Delete chat"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Which materials are at risk of running out?",
  "What are the most delayed orders?",
  "Which supplier should we prioritize?",
  "Summarize the current factory status.",
  "Which materials need reordering urgently?",
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [ollamaModel, setOllamaModel] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatsLoading, setChatsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // localStorage key scoped to user
  function lsKey(userId: string) { return `assistant_active_chat_${userId}`; }

  function persistChatId(id: string | null) {
    if (!userIdRef.current) return;
    if (id) localStorage.setItem(lsKey(userIdRef.current), id);
    else localStorage.removeItem(lsKey(userIdRef.current));
  }

  function setActiveChat(id: string | null) {
    setActiveChatId(id);
    persistChatId(id);
  }

  const loadChats = useCallback(async () => {
    setChatsLoading(true);
    try {
      const data = await (await fetch("/api/chats")).json();
      setChats(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data as Chat[] : [];
    } finally {
      setChatsLoading(false);
    }
  }, []);

  // Load user + chats, then restore last active chat
  useEffect(() => {
    (async () => {
      // Reset any state from a previous user before loading this user's data.
      setMessages([]);
      setChats([]);
      setActiveChatId(null);

      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      userIdRef.current = u.id;
      setIsAdmin(u.role === "ADMIN");

      const chatList = await loadChats();

      // Restore persisted chat
      const stored = localStorage.getItem(lsKey(u.id));
      const target = stored && chatList.find((c) => c.id === stored) ? stored
        : chatList.length > 0 ? chatList[0].id
        : null;

      if (target) {
        setActiveChatId(target);
        const data = await (await fetch(`/api/chats/${target}`)).json();
        if (data.messages) {
          setMessages(data.messages.map((m: any) => mapMessage(m)));
        }
      }
    })();

    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => { setOllamaOnline(d.ollama?.online ?? false); setOllamaModel(d.ollama?.model ?? ""); })
      .catch(() => setOllamaOnline(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function mapMessage(m: any): ChatMessage {
    return {
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      ollamaUsed: m.ollamaUsed,
      proposals: m.proposals as Proposal[] | undefined,
      createdAt: m.createdAt,
      status: m.status as "PENDING" | "COMPLETED" | "FAILED" | undefined,
      savedRequestIds: Array.isArray(m.savedRequestIds) ? m.savedRequestIds : [],
    };
  }

  async function selectChat(id: string) {
    setActiveChat(id);
    const data = await (await fetch(`/api/chats/${id}`)).json();
    if (data.messages) {
      setMessages(data.messages.map(mapMessage));
    }
  }

  async function newChat() {
    const data = await (await fetch("/api/chats", { method: "POST" })).json();
    setChats((prev) => [data, ...prev]);
    setActiveChat(data.id);
    setMessages([]);
    inputRef.current?.focus();
  }

  async function deleteChat(id: string) {
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setActiveChat(null);
      setMessages([]);
    }
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || sending) return;

    // Auto-create chat if none active
    let chatId = activeChatId;
    if (!chatId) {
      const data = await (await fetch("/api/chats", { method: "POST" })).json();
      chatId = data.id;
      setActiveChat(chatId);
      setChats((prev) => [data, ...prev]);
    }

    setInput("");
    setSending(true);
    const userMsg: ChatMessage = { role: "user", content: q };
    const loadingMsg: ChatMessage = { role: "assistant", content: "", status: "PENDING" };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, chatId, language }),
      });
      const data: AssistantApiResponse = await res.json();

      // Update chat title in sidebar
      setChats((prev) => prev.map((c) =>
        c.id === chatId
          ? { ...c, title: c.title === "New Chat" ? q.slice(0, 60) : c.title, updatedAt: data.respondedAt }
          : c
      ));

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.answer,
        ollamaUsed: data.ollamaUsed,
        proposals: data.proposals,
        savedRequestIds: data.savedRequestIds,
        respondedAt: data.respondedAt,
        status: "COMPLETED",
      };
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = assistantMsg;
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant", content: "Something went wrong. Please try again.",
          ollamaUsed: false,
          status: "FAILED",
        };
        return next;
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function retryMessage(msgId: string) {
    const msgIdx = messages.findIndex((m) => m.id === msgId);
    if (msgIdx === -1) return;

    const prevMsg = messages[msgIdx - 1];
    if (prevMsg?.role === "user") {
      setMessages((prev) => {
        const next = prev.slice(0, msgIdx);
        return next;
      });
      setSending(true);
      await send(prevMsg.content);
    }
  }

  // Poll for PENDING messages
  useEffect(() => {
    if (!activeChatId) return;

    const interval = setInterval(async () => {
      setMessages((prev) => {
        // Only poll if there are PENDING messages
        if (!prev.some((m) => m.status === "PENDING")) return prev;

        (async () => {
          try {
            const res = await fetch(`/api/chats/${activeChatId}`);
            const data = await res.json();
            if (data.messages) {
              setMessages(data.messages.map(mapMessage));
            }
          } catch (e) {
            console.error("Polling failed:", e);
          }
        })();

        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [activeChatId]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Chat history sidebar — slides in from left, hidden by default */}
      {sidebarOpen && (
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelect={(id) => { selectChat(id); }}
          onNew={newChat}
          onDelete={deleteChat}
          onClose={() => setSidebarOpen(false)}
          isAdmin={isAdmin}
        />
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 relative">

        {/* Top bar: chat history toggle + admin controls */}
        <div className="absolute top-3 left-4 right-4 z-40 flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Hide chat history" : "Show chat history"}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
              sidebarOpen
                ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {chats.length > 0 && <span className="text-zinc-600">{chats.length}</span>}
          </button>
          <div className="flex-1" />
          {isAdmin && (
            <>
              <button onClick={() => { setActiveChat(null); setMessages([]); }} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1">Clear</button>
              <button
                onClick={() => setDiagOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Diagnostics
              </button>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 pt-14 pb-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {isEmpty && (
              <div className="flex flex-col items-center justify-center pt-12 pb-6 text-center space-y-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 text-lg font-semibold">A</div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-zinc-100">Factory Assistant</h2>
                  <p className="text-sm text-zinc-500 max-w-md">Ask anything about your inventory, orders, suppliers, or production.</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {ollamaOnline === true && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>{ollamaModel}
                      </span>
                    )}
                    {ollamaOnline === false && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-500 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"/>Ollama offline
                      </span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 justify-center max-w-xl pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} disabled={sending}
                      className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id || i}>
                {msg.role === "user"
                  ? <UserBubble text={msg.content} />
                  : <AssistantBubble msg={msg} onRetry={msg.id ? retryMessage : undefined} isAdmin={isAdmin} />
                }
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-zinc-900 border border-zinc-700 focus-within:border-blue-500 rounded-xl px-4 py-3 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask about inventory, orders, suppliers, production scenarios…"
                rows={1}
                disabled={sending}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
                style={{ maxHeight: 140 }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || sending}
                className="shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
              >
                {sending
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                }
              </button>
            </div>
            <p className="text-xs text-zinc-600 text-center mt-2">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>

      {diagOpen && <DiagnosticsModal onClose={() => setDiagOpen(false)} />}
    </div>
  );
}
