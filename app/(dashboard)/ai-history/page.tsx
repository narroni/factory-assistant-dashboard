"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../lib/auth-helpers";

type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  user: { name: string; email: string };
  _count: { messages: number };
};

type ChatDetail = {
  id: string;
  title: string;
  user: { name: string; email: string };
  messages: {
    id: string;
    role: string;
    content: string;
    ollamaUsed: boolean;
    proposals: unknown;
    createdAt: string;
  }[];
};

const PAGE_SIZE = 20;

export default function AIHistoryPage() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const router = useRouter();

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (userFilter) qs.set("userId", userFilter);
      const data = await (await fetch(`/api/chats?${qs}`)).json();
      const all: ChatSummary[] = Array.isArray(data) ? data : [];
      setTotal(all.length);
      setChats(all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
    } finally {
      setLoading(false);
    }
  }, [page, userFilter]);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace("/login"); return; }
      if (u.role !== "ADMIN") { router.replace("/"); return; }
      loadChats();
    });
  }, [router, loadChats]);

  async function openChat(id: string) {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    setExpanded(id);
    setDetailLoading(true);
    try {
      const data = await (await fetch(`/api/chats/${id}`)).json();
      setDetail(data);
    } finally {
      setDetailLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-8 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">AI Interaction History</h1>
          <p className="text-xs text-zinc-500 mt-1">All assistant conversations, grouped by chat session.</p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-xs text-zinc-500">Loading…</div>
        ) : chats.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">No conversations yet.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                  <th className="px-5 py-3 font-medium">Chat Title</th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Messages</th>
                  <th className="px-5 py-3 font-medium">Last Activity</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {chats.map((chat, i) => (
                  <Fragment key={chat.id}>
                    <tr
                      onClick={() => openChat(chat.id)}
                      className={`cursor-pointer hover:bg-zinc-800/40 transition-colors ${
                        i < chats.length - 1 && expanded !== chat.id ? "border-b border-zinc-800" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-medium text-zinc-200 max-w-xs truncate">{chat.title}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-zinc-300">{chat.user.name}</p>
                        <p className="text-xs text-zinc-600">{chat.user.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-400">{chat._count.messages}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500">{new Date(chat.updatedAt).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500">{new Date(chat.createdAt).toLocaleDateString()}</td>
                    </tr>
                    {expanded === chat.id && (
                      <tr className="border-b border-zinc-800 bg-zinc-950/40">
                        <td colSpan={5} className="px-5 py-4">
                          {detailLoading ? (
                            <p className="text-xs text-zinc-500">Loading messages…</p>
                          ) : detail?.id === chat.id ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                              {detail.messages.map((m) => (
                                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                                  {m.role === "assistant" && (
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0 mt-0.5" style={{ fontSize: 9 }}>✦</div>
                                  )}
                                  <div className={`max-w-lg rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                    m.role === "user" ? "bg-blue-900/40 text-blue-200 rounded-tr-sm" : "bg-zinc-800 text-zinc-300 rounded-tl-sm"
                                  }`}>
                                    <p className="whitespace-pre-line">{m.content}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-zinc-600">{new Date(m.createdAt).toLocaleTimeString()}</span>
                                      {m.ollamaUsed && <span className="text-purple-500">llm</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                    className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 px-2 py-1 transition-colors">
                    Prev
                  </button>
                  <span className="text-xs text-zinc-600">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 px-2 py-1 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
