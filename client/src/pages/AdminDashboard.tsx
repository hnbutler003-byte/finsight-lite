import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  Shield, Users, GraduationCap, School, Building2, Trophy, Coins,
  LogOut, Search, Download, Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  LayoutDashboard, BookOpen, X, Globe, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Layers, Medal, FileText, Eye, EyeOff, Minus, Copy, Check, Loader2,
  Zap, AlertTriangle, Info, RefreshCw, Play, Clock, MessageCircle, Send, Bot
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { VideoField } from "@/components/VideoField";

// ─── Admin Help Chat ─────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

function AdminHelpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/help-chat", { messages: next });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        data-testid="button-admin-help-chat"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 font-medium text-sm"
      >
        {open ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
        {open ? "Close" : "Help"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          data-testid="panel-admin-help-chat"
          className="fixed bottom-20 right-6 z-50 w-[360px] max-h-[520px] flex flex-col rounded-2xl shadow-2xl border border-slate-700 bg-slate-900 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-indigo-700 text-white">
            <Bot className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm leading-none">Admin Assistant</p>
              <p className="text-xs text-indigo-200 mt-0.5">Ask me anything about the platform</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
            {messages.length === 0 && (
              <div className="text-slate-400 text-sm text-center mt-8 space-y-2">
                <p>👋 Hi! I can help you navigate FinSight Lite.</p>
                <p className="text-xs text-slate-500">Try: "How do I add a teacher?" or "Where is the audit log?"</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  data-testid={`chat-message-${i}`}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-slate-800 text-slate-200 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 rounded-xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            <div ref={el => { if (el) el.scrollIntoView({ behavior: "smooth" }); }} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-700 flex gap-2">
            <input
              data-testid="input-admin-help-chat"
              className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-500 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Ask a question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              data-testid="button-send-admin-help"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg px-3 py-2 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: any) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const TABS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "pending", label: "Pending Orgs", icon: Clock },
  { id: "organizations", label: "Organizations", icon: Globe },
  { id: "schools", label: "Schools", icon: School },
  { id: "teachers", label: "Teachers", icon: GraduationCap },
  { id: "students", label: "Students", icon: Users },
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "sponsors", label: "Sponsors", icon: Coins },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "reports", label: "Reports", icon: Download },
  { id: "jobs", label: "Background Jobs", icon: Loader2 },
  { id: "perf", label: "Perf Agent", icon: Zap },
  { id: "audit", label: "Audit Log", icon: FileText },
  { id: "dbviewer", label: "DB Viewer", icon: Building2 },
];

function ObservabilityCard() {
  const { data } = useQuery<any>({
    queryKey: ["/api/admin/observability"],
    queryFn: () => apiRequest("GET", "/api/admin/observability").then(r => r.json()),
  });
  const sentry = data?.sentry;
  return (
    <Card className="bg-slate-800 border-slate-700" data-testid="card-observability">
      <CardHeader><CardTitle className="text-slate-200 text-base flex items-center gap-2">
        <FileText className="w-4 h-4 text-indigo-400" /> Observability
      </CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Sentry (server)</span>
          <Badge className={sentry?.serverEnabled ? "bg-emerald-600" : "bg-slate-600"} data-testid="badge-sentry-server">
            {sentry?.serverEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Sentry (client)</span>
          <Badge className={sentry?.clientDsnConfigured ? "bg-emerald-600" : "bg-slate-600"} data-testid="badge-sentry-client">
            {sentry?.clientDsnConfigured ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Health-check email alerts</span>
          <Badge className={data?.alertEmail ? "bg-emerald-600" : "bg-slate-600"} data-testid="badge-alert-email">
            {data?.alertEmail ? "Configured" : "Not configured"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Health endpoint</span>
          <a href={data?.healthz?.url || "/healthz"} target="_blank" rel="noreferrer"
             className="text-indigo-300 hover:text-indigo-200 underline text-xs font-mono"
             data-testid="link-healthz">{data?.healthz?.url || "/healthz"}</a>
        </div>
        {sentry?.projectUrl && (
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Sentry project</span>
            <a href={sentry.projectUrl} target="_blank" rel="noreferrer"
               className="text-indigo-300 hover:text-indigo-200 underline text-xs"
               data-testid="link-sentry-project">Open in Sentry →</a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditLogPanel() {
  const [actorType, setActorType] = useState<string>("all");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (actorType !== "all") params.set("actorType", actorType);
  if (action) params.set("action", action);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("limit", "200");

  const { data: rows = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/audit-log", actorType, action, from, to],
    queryFn: () => apiRequest("GET", `/api/admin/audit-log?${params.toString()}`).then(r => r.json()),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Audit Log</h2>
        <Button onClick={() => refetch()} className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-audit-refresh">
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Actor type</Label>
          <Select value={actorType} onValueChange={setActorType}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-audit-actor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All</SelectItem>
              <SelectItem value="admin" className="text-white">Admin</SelectItem>
              <SelectItem value="org_admin" className="text-white">Org admin</SelectItem>
              <SelectItem value="teacher" className="text-white">Teacher</SelectItem>
              <SelectItem value="student" className="text-white">Student</SelectItem>
              <SelectItem value="system" className="text-white">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Action contains</Label>
          <Input value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. branding"
            className="bg-slate-800 border-slate-700 text-white" data-testid="input-audit-action" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white" data-testid="input-audit-from" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">To</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white" data-testid="input-audit-to" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="text-left px-4 py-3 text-slate-300 font-semibold">When</th>
              <th className="text-left px-4 py-3 text-slate-300 font-semibold">Actor</th>
              <th className="text-left px-4 py-3 text-slate-300 font-semibold">Action</th>
              <th className="text-left px-4 py-3 text-slate-300 font-semibold">Target</th>
              <th className="text-left px-4 py-3 text-slate-300 font-semibold">Org</th>
              <th className="text-left px-4 py-3 text-slate-300 font-semibold">Meta</th>
              <th className="text-left px-4 py-3 text-slate-300 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-300">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-300">No audit entries found</td></tr>
            ) : rows.map((r: any) => (
              <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/50" data-testid={`row-audit-${r.id}`}>
                <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-300 whitespace-nowrap">
                  <span className="text-xs uppercase tracking-wide text-indigo-300">{r.actorType}</span>
                  <div className="text-xs text-slate-400">{r.actorEmail || r.actorId || "-"}</div>
                </td>
                <td className="px-4 py-2 text-white font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 text-slate-300 text-xs">{r.targetType ? `${r.targetType}#${r.targetId}` : "-"}</td>
                <td className="px-4 py-2 text-slate-300 text-xs">{r.orgId || "-"}</td>
                <td className="px-4 py-2 text-slate-400 text-xs max-w-[280px] truncate font-mono">
                  {r.meta ? JSON.stringify(r.meta) : "-"}
                </td>
                <td className="px-4 py-2 text-slate-400 text-xs">{r.ip || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── reusable DataTable ──────────────────────────────────────────────────────

function DataTable({
  data, columns, searchKeys, pageSize = 15
}: {
  data: any[];
  columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[];
  searchKeys: string[];
  pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = data;
    if (q) {
      const lower = q.toLowerCase();
      rows = rows.filter(row => searchKeys.some(k => String(row[k] ?? "").toLowerCase().includes(lower)));
    }
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const va = String(a[sort.key] ?? "");
        const vb = String(b[sort.key] ?? "");
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return rows;
  }, [data, q, sort, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    setSort(prev => prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-300" />
          <Input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="pl-8 h-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-300 text-sm"
            data-testid="input-table-search"
          />
        </div>
        <span className="text-slate-300 text-sm">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="text-left px-4 py-3 text-slate-300 font-semibold cursor-pointer hover:text-white select-none whitespace-nowrap"
                >
                  {col.label} {sort?.key === col.key ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-300">No records found</td></tr>
            ) : paginated.map((row, i) => (
              <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-300 text-xs">Page {page} of {totalPages}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 h-8 px-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 h-8 px-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── metric card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-slate-200 text-sm font-medium">{label}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── global search bar ────────────────────────────────────────────────────────

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: results } = useQuery<any>({
    queryKey: ["/api/admin/search", q],
    queryFn: () => q.length > 1 ? apiRequest("GET", `/api/admin/search?q=${encodeURIComponent(q)}`).then(r => r.json()) : null,
    enabled: q.length > 1,
  });

  const allResults = results ? [
    ...results.students, ...results.teachers, ...results.classes,
    ...results.sponsors, ...results.schools
  ] : [];

  const typeColor: Record<string, string> = {
    student: "bg-violet-600", teacher: "bg-emerald-600",
    class: "bg-blue-600", sponsor: "bg-amber-600", school: "bg-pink-600",
  };

  return (
    <div className="relative flex-1 max-w-lg">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-300 z-10" />
      <Input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search students, teachers, schools, sponsors..."
        className="pl-9 pr-8 bg-slate-800 border-slate-700 text-white placeholder:text-slate-300 w-full"
        data-testid="input-global-search"
      />
      {q && <button onClick={() => { setQ(""); setOpen(false); }} className="absolute right-3 top-2.5 text-slate-300 hover:text-white"><X className="h-4 w-4" /></button>}
      {open && q.length > 1 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-72 overflow-y-auto">
          {allResults.length === 0 ? (
            <p className="px-4 py-3 text-slate-300 text-sm">No results found</p>
          ) : allResults.map((r, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase ${typeColor[r.type]}`}>{r.type}</span>
              <span className="text-white text-sm">{r.name}</span>
              {r.email && <span className="text-slate-300 text-xs">{r.email}</span>}
              {r.school && <span className="text-slate-300 text-xs">• {r.school}</span>}
              {r.code && <span className="text-slate-300 text-xs">• Code: {r.code}</span>}
              {r.country && <span className="text-slate-300 text-xs">• {r.country}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── school / sponsor form dialog ─────────────────────────────────────────────

function SchoolDialog({ existing, onClose }: { existing?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: existing?.name || "", country: existing?.country || "Bahamas", city: existing?.city || "", website: existing?.website || "" });
  const mut = useMutation({
    mutationFn: (data: any) => existing
      ? apiRequest("PATCH", `/api/admin/schools/${existing.id}`, data).then(r => r.json())
      : apiRequest("POST", "/api/admin/schools", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/schools"] });
      toast({ title: existing ? "School updated" : "School added" });
      onClose();
    },
  });

  return (
    <div className="space-y-4">
      {[
        { label: "School Name", key: "name", placeholder: "e.g. Queen's College" },
        { label: "Country", key: "country", placeholder: "e.g. Bahamas" },
        { label: "City", key: "city", placeholder: "e.g. Nassau" },
        { label: "Website", key: "website", placeholder: "https://..." },
      ].map(f => (
        <div key={f.key}>
          <Label className="text-slate-300">{f.label}</Label>
          <Input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            placeholder={f.placeholder} className="mt-1 bg-slate-700 border-slate-600 text-white" />
        </div>
      ))}
      <Button onClick={() => mut.mutate(form)} disabled={mut.isPending || !form.name}
        className="w-full bg-indigo-600 hover:bg-indigo-700">
        {mut.isPending ? "Saving..." : existing ? "Update School" : "Add School"}
      </Button>
    </div>
  );
}

function SponsorDialog({ existing, onClose }: { existing?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: existing?.name || "", type: existing?.type || "business", contactName: existing?.contactName || "", contactEmail: existing?.contactEmail || "", website: existing?.website || "", country: existing?.country || "Bahamas" });
  const mut = useMutation({
    mutationFn: (data: any) => existing
      ? apiRequest("PATCH", `/api/admin/sponsors/${existing.id}`, data).then(r => r.json())
      : apiRequest("POST", "/api/admin/sponsors", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/sponsors"] });
      toast({ title: existing ? "Sponsor updated" : "Sponsor added" });
      onClose();
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-slate-300">Sponsor Name</Label>
        <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Commonwealth Bank" className="mt-1 bg-slate-700 border-slate-600 text-white" />
      </div>
      <div>
        <Label className="text-slate-300">Type</Label>
        <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
          <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            {["bank", "credit_union", "business", "government", "other"].map(t => (
              <SelectItem key={t} value={t} className="text-white capitalize">{t.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {[
        { label: "Contact Name", key: "contactName", placeholder: "Jane Smith" },
        { label: "Contact Email", key: "contactEmail", placeholder: "jane@bank.com" },
        { label: "Website", key: "website", placeholder: "https://..." },
        { label: "Country", key: "country", placeholder: "Bahamas" },
      ].map(f => (
        <div key={f.key}>
          <Label className="text-slate-300">{f.label}</Label>
          <Input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            placeholder={f.placeholder} className="mt-1 bg-slate-700 border-slate-600 text-white" />
        </div>
      ))}
      <Button onClick={() => mut.mutate(form)} disabled={mut.isPending || !form.name}
        className="w-full bg-indigo-600 hover:bg-indigo-700">
        {mut.isPending ? "Saving..." : existing ? "Update Sponsor" : "Add Sponsor"}
      </Button>
    </div>
  );
}

// ─── OrgDialog ───────────────────────────────────────────────────────────────

function OrgDialog({ existing, onClose }: { existing?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    type: existing?.type ?? "school",
    country: existing?.country ?? "Bahamas",
    city: existing?.city ?? "",
    website: existing?.website ?? "",
    contact_name: existing?.contact_name ?? "",
    contact_email: existing?.contact_email ?? "",
    subscription_tier: existing?.subscription_tier ?? "starter",
    max_students: existing?.max_students ?? 50,
    display_label: existing?.display_label ?? "",
  });
  const save = useMutation({
    mutationFn: () => existing
      ? apiRequest("PATCH", `/api/admin/organizations/${existing.id}`, form).then(r => r.json())
      : apiRequest("POST", "/api/admin/organizations", form).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({ title: existing ? "Organization updated" : "Organization created" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-slate-300 text-xs mb-1 block">Organization Name *</Label>
          <Input value={form.name} onChange={f("name")} placeholder="e.g. St. Anne's High School"
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-300" data-testid="input-org-name" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Type</Label>
          <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-org-type"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {["school","credit_union","government","ngo","other"].map(t => (
                <SelectItem key={t} value={t} className="text-white hover:bg-slate-700 capitalize">{t.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Tier</Label>
          <Select value={form.subscription_tier} onValueChange={v => setForm(p => ({
              ...p,
              subscription_tier: v,
              max_students: v === "starter" ? 50 : v === "academy" ? 100 : v === "institution" ? 250 : p.max_students,
            }))}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-org-tier"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="starter" className="text-white hover:bg-slate-700">Starter (up to 50 students)</SelectItem>
              <SelectItem value="academy" className="text-white hover:bg-slate-700">Academy (up to 100 students)</SelectItem>
              <SelectItem value="institution" className="text-white hover:bg-slate-700">Institution, 250+ students (custom)</SelectItem>
              {existing?.subscription_tier && !["starter","academy","institution"].includes(existing.subscription_tier) && (
                <SelectItem value={existing.subscription_tier} className="text-yellow-300 hover:bg-slate-700">
                  {existing.subscription_tier} (legacy, please reassign)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Country</Label>
          <Input value={form.country} onChange={f("country")} className="bg-slate-700 border-slate-600 text-white" data-testid="input-org-country" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">City</Label>
          <Input value={form.city} onChange={f("city")} className="bg-slate-700 border-slate-600 text-white" data-testid="input-org-city" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Contact Name</Label>
          <Input value={form.contact_name} onChange={f("contact_name")} className="bg-slate-700 border-slate-600 text-white" data-testid="input-org-contact-name" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Contact Email</Label>
          <Input value={form.contact_email} onChange={f("contact_email")} type="email" className="bg-slate-700 border-slate-600 text-white" data-testid="input-org-contact-email" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Website</Label>
          <Input value={form.website} onChange={f("website")} placeholder="https://" className="bg-slate-700 border-slate-600 text-white" data-testid="input-org-website" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Max Students</Label>
          <Input value={form.max_students} onChange={e => setForm(p => ({ ...p, max_students: Number(e.target.value) }))} type="number" min={1} className="bg-slate-700 border-slate-600 text-white" data-testid="input-org-max-students" />
        </div>
        <div className="col-span-2">
          <Label className="text-slate-300 text-xs mb-1 block">Display Label <span className="text-slate-500 font-normal">(optional)</span></Label>
          <Input value={form.display_label} onChange={f("display_label")} placeholder="e.g. Ministry Partner, Gold Partner…" className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" data-testid="input-org-display-label" />
          <p className="text-slate-500 text-xs mt-1">Custom name shown to this org's users. Falls back to the org name if left blank.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:text-white">Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}
          className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-save-org">
          {save.isPending ? "Saving…" : existing ? "Save Changes" : "Create Organization"}
        </Button>
      </div>
    </div>
  );
}

// ─── EnvCard (shows env info + prominent join code banner) ───────────────────

function EnvCard({ env }: { env: any }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!env.join_code) return;
    navigator.clipboard.writeText(env.join_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: env.theme_color ?? "#7c3aed" }} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate" data-testid={`text-env-name-${env.id}`}>{env.display_name}</p>
          <p className="text-slate-400 text-xs font-mono">{env.slug}</p>
        </div>
        {(env.features_enabled ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(env.features_enabled ?? []).map((f: string) => (
              <span key={f} className="text-xs bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded">{f.replace("_", " ")}</span>
            ))}
          </div>
        )}
      </div>
      {/* Join code banner */}
      {env.join_code && (
        <div className="mx-3 mb-3 rounded-lg bg-indigo-950 border border-indigo-700/60 px-3 py-2.5">
          <p className="text-indigo-300 text-[10px] uppercase tracking-widest font-semibold mb-1.5">Student join code: share this with your class</p>
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-white font-mono font-bold text-2xl tracking-[0.25em]"
              data-testid={`text-join-code-${env.id}`}
            >
              {env.join_code}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 transition-colors text-white text-xs font-semibold"
              data-testid={`button-copy-join-code-${env.id}`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EnvDialog ───────────────────────────────────────────────────────────────

function EnvDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ slug: "", display_name: "", theme_color: "#7c3aed" });
  const [createdEnv, setCreatedEnv] = useState<{ join_code: string; display_name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const save = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/organizations/${orgId}/environments`, form).then(r => r.json()),
    onSuccess: (env: any) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/organizations", orgId, "environments"] });
      setCreatedEnv({ join_code: env.join_code, display_name: env.display_name });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyCode = () => {
    if (!createdEnv?.join_code) return;
    navigator.clipboard.writeText(createdEnv.join_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (createdEnv) {
    return (
      <div className="space-y-4 pt-2">
        <div className="flex flex-col items-center gap-1 text-center pb-1">
          <div className="w-10 h-10 rounded-full bg-emerald-900/60 border border-emerald-600/50 flex items-center justify-center mb-1">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-white font-semibold text-base">Environment created!</p>
          <p className="text-slate-400 text-sm">Share this code with your students so they can join <span className="text-white font-medium">{createdEnv.display_name}</span>.</p>
        </div>
        <div className="rounded-xl bg-indigo-950 border border-indigo-600/60 px-4 py-4 text-center">
          <p className="text-indigo-300 text-[10px] uppercase tracking-widest font-semibold mb-3">Student join code</p>
          <p
            className="text-white font-mono font-bold text-4xl tracking-[0.3em] mb-4"
            data-testid="text-new-join-code"
          >
            {createdEnv.join_code}
          </p>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 mx-auto px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors text-white text-sm font-semibold"
            data-testid="button-copy-new-join-code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy code"}
          </button>
        </div>
        <p className="text-slate-500 text-xs text-center">You can always find this code again by viewing the environment in the org panel.</p>
        <div className="flex justify-end pt-1">
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-done-env">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <div>
        <Label className="text-slate-300 text-xs mb-1 block">Display Name *</Label>
        <Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
          placeholder="e.g. Grade 10 - Block A"
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-300" data-testid="input-env-name" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs mb-1 block">Slug (URL-safe, lowercase) *</Label>
        <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"") }))}
          placeholder="e.g. grade10-block-a"
          className="bg-slate-700 border-slate-600 text-white font-mono placeholder:text-slate-300" data-testid="input-env-slug" />
      </div>
      <div>
        <Label className="text-slate-300 text-xs mb-1 block">Theme Color</Label>
        <div className="flex gap-2 items-center">
          <input type="color" value={form.theme_color} onChange={e => setForm(p => ({ ...p, theme_color: e.target.value }))}
            className="w-10 h-10 rounded border border-slate-600 bg-slate-700 cursor-pointer" data-testid="input-env-color" />
          <span className="text-slate-300 text-sm font-mono">{form.theme_color}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:text-white">Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.display_name || !form.slug}
          className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-save-env">
          {save.isPending ? "Creating…" : "Create Environment"}
        </Button>
      </div>
    </div>
  );
}

// ─── LessonPlanDialog ─────────────────────────────────────────────────────────

type QuizQ = { question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string };
type ContentSect = { heading: string; body: string; examples: string };
type LessonMeta = { title: string; instructor: string; subject: string; grade_level: string; topic: string; duration: string; video_url: string };
type LessonPlanRecord = {
  id: string; org_id: string; is_published: boolean; created_at: string;
  title: string; instructor?: string | null; subject?: string | null;
  grade_level?: string | null; topic?: string | null; duration?: string | null; video_url?: string | null;
  objectives: string[];
  content_sections: { heading: string; body: string; examples?: string[] }[];
  questions?: { question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; order_index: number }[];
};

function LessonPlanDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [meta, setMeta] = useState({
    title: "", instructor: "", subject: "Personal Finance",
    grade_level: "", topic: "", duration: "", video_url: "",
  });
  const [objectives, setObjectives] = useState<string[]>(["", "", "", ""]);
  const [sections, setSections] = useState<ContentSect[]>([{ heading: "", body: "", examples: "" }]);
  const [questions, setQuestions] = useState<QuizQ[]>([
    { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" },
  ]);
  const [step, setStep] = useState<"meta" | "content" | "quiz">("meta");

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...meta,
        objectives: objectives.filter(o => o.trim()),
        content_sections: sections
          .filter(s => s.heading.trim() || s.body.trim())
          .map(s => ({
            heading: s.heading,
            body: s.body,
            examples: s.examples ? s.examples.split(",").map(e => e.trim()).filter(Boolean) : [],
          })),
        questions: questions.filter(q => q.question.trim() && q.option_a && q.option_b && q.option_c && q.option_d),
      };
      return apiRequest("POST", `/api/admin/organizations/${orgId}/lessons`, payload).then(r => r.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/organizations", orgId, "lessons"] });
      toast({ title: "Lesson created. Remember to publish it!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fm = (k: string) => (e: any) => setMeta(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto pr-1">
      <div className="flex gap-2 mb-4">
        {(["meta", "content", "quiz"] as const).map((s, i) => (
          <button key={s} onClick={() => setStep(s)}
            className={`flex-1 py-1.5 rounded text-xs font-bold border transition-colors ${step === s ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-600 text-slate-300 hover:text-white"}`}>
            {i + 1}. {s === "meta" ? "Details" : s === "content" ? "Content" : "Quiz"}
          </button>
        ))}
      </div>

      {step === "meta" && (
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Lesson Title *</Label>
            <Input value={meta.title} onChange={fm("title")} placeholder="e.g. Needs and Wants" className="bg-slate-700 border-slate-600 text-white" data-testid="input-lesson-title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Instructor</Label>
              <Input value={meta.instructor} onChange={fm("instructor")} placeholder="Mrs. Deveaux" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Subject</Label>
              <Input value={meta.subject} onChange={fm("subject")} placeholder="Personal Finance" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Grade Level</Label>
              <Input value={meta.grade_level} onChange={fm("grade_level")} placeholder="5/6" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Topic</Label>
              <Input value={meta.topic} onChange={fm("topic")} placeholder="Needs and Wants" className="bg-slate-700 border-slate-600 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Duration</Label>
            <Input value={meta.duration} onChange={fm("duration")} placeholder="45 minutes (Period 7)" className="bg-slate-700 border-slate-600 text-white" />
          </div>
          <VideoField
            value={meta.video_url}
            onChange={url => setMeta(p => ({ ...p, video_url: url }))}
            darkMode
            uploadEndpoint={`/api/admin/organizations/${orgId}/videos/upload`}
            listEndpoint={`/api/admin/organizations/${orgId}/videos`}
          />
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Learning Objectives</Label>
            <div className="space-y-2">
              {objectives.map((obj, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={obj} onChange={e => setObjectives(p => p.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`Objective ${i + 1}`} className="bg-slate-700 border-slate-600 text-white text-sm flex-1" />
                  {objectives.length > 1 && (
                    <button onClick={() => setObjectives(p => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400 px-1">
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setObjectives(p => [...p, ""])} className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add objective
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={() => setStep("content")} disabled={!meta.title} className="bg-indigo-600 hover:bg-indigo-700">
              Next: Content →
            </Button>
          </div>
        </div>
      )}

      {step === "content" && (
        <div className="space-y-4">
          <p className="text-slate-300 text-xs">Add content sections: definitions, explanations, examples.</p>
          {sections.map((sec, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs font-bold">Section {i + 1}</span>
                {sections.length > 1 && (
                  <button onClick={() => setSections(p => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Input value={sec.heading} onChange={e => setSections(p => p.map((s, j) => j === i ? { ...s, heading: e.target.value } : s))}
                placeholder="Section heading (e.g. What is a Need?)" className="bg-slate-700 border-slate-600 text-white text-sm" />
              <Textarea value={sec.body} onChange={(e: any) => setSections(p => p.map((s, j) => j === i ? { ...s, body: e.target.value } : s))}
                placeholder="Definition or explanation..." className="bg-slate-700 border-slate-600 text-white text-sm resize-none h-20" />
              <Input value={sec.examples} onChange={e => setSections(p => p.map((s, j) => j === i ? { ...s, examples: e.target.value } : s))}
                placeholder="Examples (comma-separated): Food, Water, Shelter" className="bg-slate-700 border-slate-600 text-white text-sm" />
            </div>
          ))}
          <button onClick={() => setSections(p => [...p, { heading: "", body: "", examples: "" }])} className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add section
          </button>
          <div className="flex justify-between pt-1">
            <Button variant="ghost" onClick={() => setStep("meta")} className="text-slate-300 hover:text-white">← Back</Button>
            <Button onClick={() => setStep("quiz")} className="bg-indigo-600 hover:bg-indigo-700">Next: Quiz →</Button>
          </div>
        </div>
      )}

      {step === "quiz" && (
        <div className="space-y-4">
          <p className="text-slate-300 text-xs">Add multiple-choice quiz questions. Select the correct answer for each.</p>
          {questions.map((q, qi) => (
            <div key={qi} className="space-y-2 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs font-bold">Q{qi + 1}</span>
                {questions.length > 1 && (
                  <button onClick={() => setQuestions(p => p.filter((_, j) => j !== qi))} className="text-slate-300 hover:text-red-400">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Textarea value={q.question} onChange={(e: any) => setQuestions(p => p.map((x, j) => j === qi ? { ...x, question: e.target.value } : x))}
                placeholder="Question text..." className="bg-slate-700 border-slate-600 text-white text-sm resize-none h-16" />
              <div className="grid grid-cols-2 gap-2">
                {(["option_a", "option_b", "option_c", "option_d"] as const).map((opt, oi) => {
                  const letter = String.fromCharCode(65 + oi);
                  const isCorrect = q.correct_answer === letter;
                  const optValue: string = q[opt];
                  return (
                    <div key={opt} className={`flex gap-1.5 items-center p-1.5 rounded border cursor-pointer transition-colors ${isCorrect ? "border-emerald-500 bg-emerald-900/30" : "border-slate-600 hover:border-slate-500"}`}
                      onClick={() => setQuestions(p => p.map((x, j) => j === qi ? { ...x, correct_answer: letter } : x))}>
                      <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center flex-shrink-0 ${isCorrect ? "bg-emerald-500 text-white" : "bg-slate-600 text-slate-300"}`}>{letter}</span>
                      <Input value={optValue}
                        onChange={e => setQuestions(p => p.map((x, j) => j === qi ? { ...x, [opt]: e.target.value } : x))}
                        onClick={e => e.stopPropagation()}
                        placeholder={`Option ${letter}`} className="bg-transparent border-0 text-white text-xs p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-300">Click an option to mark it correct</p>
            </div>
          ))}
          <button onClick={() => setQuestions(p => [...p, { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }])}
            className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add question
          </button>
          <div className="flex justify-between pt-1">
            <Button variant="ghost" onClick={() => setStep("content")} className="text-slate-300 hover:text-white">← Back</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !meta.title} className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-save-lesson">
              {save.isPending ? "Saving…" : "Create Lesson"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AdminEditLessonDialog ───────────────────────────────────────────────────

type LessonFullData = LessonPlanRecord;

function AdminEditLessonDialog({ orgId, lessonId, onClose }: { orgId: string; lessonId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<"meta" | "content" | "quiz">("meta");
  const [meta, setMeta] = useState<LessonMeta | null>(null);
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [sections, setSections] = useState<ContentSect[]>([{ heading: "", body: "", examples: "" }]);
  const [questions, setQuestions] = useState<QuizQ[]>([{ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]);
  const [initialized, setInitialized] = useState(false);

  const { data: lessonFull, isLoading, isError } = useQuery<LessonFullData>({
    queryKey: ["admin-lesson-detail", lessonId],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/admin/lessons/${lessonId}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "Failed to load lesson");
      return r.json();
    },
    enabled: !!lessonId,
  });

  useEffect(() => {
    if (lessonFull && !initialized) {
      setInitialized(true);
      setMeta({
        title: lessonFull.title ?? "",
        instructor: lessonFull.instructor ?? "",
        subject: lessonFull.subject ?? "",
        grade_level: lessonFull.grade_level ?? "",
        topic: lessonFull.topic ?? "",
        duration: lessonFull.duration ?? "",
        video_url: lessonFull.video_url ?? "",
      });
      setObjectives(lessonFull.objectives?.length ? lessonFull.objectives : [""]);
      setSections(lessonFull.content_sections?.length
        ? lessonFull.content_sections.map(s => ({ heading: s.heading, body: s.body, examples: (s.examples ?? []).join(", ") }))
        : [{ heading: "", body: "", examples: "" }]);
      if (lessonFull.questions?.length) {
        setQuestions(lessonFull.questions.slice().sort((a, b) => a.order_index - b.order_index));
      }
    }
  }, [lessonFull, initialized]);

  const save = useMutation({
    mutationFn: () => {
      const validQuestions = questions.filter(q => q.question.trim() && q.option_a && q.option_b && q.option_c && q.option_d);
      const payload: Record<string, unknown> = {
        ...(meta ?? {}),
        objectives: objectives.filter(o => o.trim()),
        content_sections: sections
          .filter(s => s.heading.trim() || s.body.trim())
          .map(s => ({
            heading: s.heading,
            body: s.body,
            examples: s.examples ? s.examples.split(",").map(e => e.trim()).filter(Boolean) : [],
          })),
      };
      if (!isError) {
        payload.questions = validQuestions;
      }
      return apiRequest("PATCH", `/api/admin/lessons/${lessonId}`, payload).then(r => r.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/organizations", orgId, "lessons"] });
      toast({ title: "Lesson updated!" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setMetaField = (k: keyof LessonMeta) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMeta(p => p ? { ...p, [k]: e.target.value } : p);

  if (isError) {
    return <p className="text-sm text-red-400 py-8 text-center">Failed to load lesson details. Please close and try again.</p>;
  }

  if (isLoading || !initialized || !meta) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  }

  return (
    <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto pr-1">
      <div className="flex gap-2 mb-4">
        {(["meta", "content", "quiz"] as const).map((s, i) => (
          <button key={s} onClick={() => setStep(s)}
            className={`flex-1 py-1.5 rounded text-xs font-bold border transition-colors ${step === s ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-600 text-slate-300 hover:text-white"}`}>
            {i + 1}. {s === "meta" ? "Details" : s === "content" ? "Content" : "Quiz"}
          </button>
        ))}
      </div>

      {step === "meta" && (
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Lesson Title *</Label>
            <Input value={meta.title} onChange={setMetaField("title")} placeholder="e.g. Needs and Wants" className="bg-slate-700 border-slate-600 text-white" data-testid="input-edit-lesson-title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Instructor</Label>
              <Input value={meta.instructor} onChange={setMetaField("instructor")} placeholder="Mrs. Deveaux" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Subject</Label>
              <Input value={meta.subject} onChange={setMetaField("subject")} placeholder="Personal Finance" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Grade Level</Label>
              <Input value={meta.grade_level} onChange={setMetaField("grade_level")} placeholder="5/6" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">Topic</Label>
              <Input value={meta.topic} onChange={setMetaField("topic")} placeholder="Needs and Wants" className="bg-slate-700 border-slate-600 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Duration</Label>
            <Input value={meta.duration} onChange={setMetaField("duration")} placeholder="45 minutes" className="bg-slate-700 border-slate-600 text-white" />
          </div>
          <VideoField
            value={meta.video_url}
            onChange={url => setMeta(p => p ? { ...p, video_url: url } : p)}
            darkMode
            uploadEndpoint={`/api/admin/organizations/${orgId}/videos/upload`}
            listEndpoint={`/api/admin/organizations/${orgId}/videos`}
          />
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Learning Objectives</Label>
            <div className="space-y-2">
              {objectives.map((obj, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={obj}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setObjectives(p => p.map((x, j) => j === i ? e.target.value : x))
                    }
                    placeholder={`Objective ${i + 1}`} className="bg-slate-700 border-slate-600 text-white text-sm flex-1" />
                  {objectives.length > 1 && (
                    <button onClick={() => setObjectives(p => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400 px-1">
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setObjectives(p => [...p, ""])} className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add objective
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={() => setStep("content")} disabled={!meta.title} className="bg-indigo-600 hover:bg-indigo-700">
              Next: Content →
            </Button>
          </div>
        </div>
      )}

      {step === "content" && (
        <div className="space-y-4">
          <p className="text-slate-300 text-xs">Edit content sections: all existing sections will be replaced on save.</p>
          {sections.map((sec, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs font-bold">Section {i + 1}</span>
                {sections.length > 1 && (
                  <button onClick={() => setSections(p => p.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Input value={sec.heading}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSections(p => p.map((s, j) => j === i ? { ...s, heading: e.target.value } : s))
                }
                placeholder="Section heading" className="bg-slate-700 border-slate-600 text-white text-sm" />
              <Textarea value={sec.body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setSections(p => p.map((s, j) => j === i ? { ...s, body: e.target.value } : s))
                }
                placeholder="Definition or explanation..." className="bg-slate-700 border-slate-600 text-white text-sm resize-none h-20" />
              <Input value={sec.examples}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSections(p => p.map((s, j) => j === i ? { ...s, examples: e.target.value } : s))
                }
                placeholder="Examples (comma-separated)" className="bg-slate-700 border-slate-600 text-white text-sm" />
            </div>
          ))}
          <button onClick={() => setSections(p => [...p, { heading: "", body: "", examples: "" }])} className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add section
          </button>
          <div className="flex justify-between pt-1">
            <Button variant="ghost" onClick={() => setStep("meta")} className="text-slate-300 hover:text-white">← Back</Button>
            <Button onClick={() => setStep("quiz")} className="bg-indigo-600 hover:bg-indigo-700">Next: Quiz →</Button>
          </div>
        </div>
      )}

      {step === "quiz" && (
        <div className="space-y-4">
          <p className="text-slate-300 text-xs">Edit quiz questions. Existing questions will be replaced on save.</p>
          {questions.map((q, qi) => (
            <div key={qi} className="space-y-2 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs font-bold">Q{qi + 1}</span>
                {questions.length > 1 && (
                  <button onClick={() => setQuestions(p => p.filter((_, j) => j !== qi))} className="text-slate-300 hover:text-red-400">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Textarea value={q.question}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setQuestions(p => p.map((x, j) => j === qi ? { ...x, question: e.target.value } : x))
                }
                placeholder="Question text..." className="bg-slate-700 border-slate-600 text-white text-sm resize-none h-16" />
              <div className="grid grid-cols-2 gap-2">
                {(["option_a", "option_b", "option_c", "option_d"] as const).map((opt, oi) => {
                  const letter = String.fromCharCode(65 + oi);
                  const isCorrect = q.correct_answer === letter;
                  const optValue: string = q[opt];
                  return (
                    <div key={opt}
                      className={`flex gap-1.5 items-center p-1.5 rounded border cursor-pointer transition-colors ${isCorrect ? "border-emerald-500 bg-emerald-900/30" : "border-slate-600 hover:border-slate-500"}`}
                      onClick={() => setQuestions(p => p.map((x, j) => j === qi ? { ...x, correct_answer: letter } : x))}>
                      <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center flex-shrink-0 ${isCorrect ? "bg-emerald-500 text-white" : "bg-slate-600 text-slate-300"}`}>{letter}</span>
                      <Input value={optValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setQuestions(p => p.map((x, j) => j === qi ? { ...x, [opt]: e.target.value } : x))
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        placeholder={`Option ${letter}`} className="bg-transparent border-0 text-white text-xs p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-300">Click an option to mark it correct</p>
            </div>
          ))}
          <button onClick={() => setQuestions(p => [...p, { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }])}
            className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add question
          </button>
          <div className="flex justify-between pt-1">
            <Button variant="ghost" onClick={() => setStep("content")} className="text-slate-300 hover:text-white">← Back</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !meta.title} className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-update-lesson">
              {save.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OrgCard ─────────────────────────────────────────────────────────────────

function OrgCard({ org, onEdit }: { org: any; onEdit: (org: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [envDialog, setEnvDialog] = useState(false);
  const [lessonDialog, setLessonDialog] = useState(false);
  const [editLesson, setEditLesson] = useState<string | null>(null);
  const [deleteLesson, setDeleteLesson] = useState<LessonPlanRecord | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: envs = [], isLoading: envsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/organizations", org.id, "environments"],
    queryFn: () => apiRequest("GET", `/api/admin/organizations/${org.id}/environments`).then(r => r.json()),
    enabled: expanded,
  });
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/organizations", org.id, "lessons"],
    queryFn: () => apiRequest("GET", `/api/admin/organizations/${org.id}/lessons`).then(r => r.json()),
    enabled: expanded,
  });
  const toggleActive = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/admin/organizations/${org.id}`, { is_active: !org.is_active }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/organizations"] }); },
    onError: () => toast({ title: "Error toggling status", variant: "destructive" }),
  });
  const togglePublish = useMutation({
    mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
      apiRequest("PATCH", `/api/admin/lessons/${id}/publish`, { is_published }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/organizations", org.id, "lessons"] }); },
    onError: () => toast({ title: "Error updating lesson", variant: "destructive" }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/lessons/${id}`).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/organizations", org.id, "lessons"] });
      toast({ title: "Lesson deleted" });
      setDeleteLesson(null);
    },
    onError: () => toast({ title: "Error deleting lesson", variant: "destructive" }),
  });

  const tierColors: Record<string, string> = {
    starter: "bg-emerald-900 text-emerald-300",
    academy: "bg-blue-900 text-blue-300",
    institution: "bg-amber-900 text-amber-300",
    free: "bg-slate-700 text-slate-300",
    standard: "bg-sky-900 text-sky-300",
    premium: "bg-violet-900 text-violet-300",
  };
  const typeColors: Record<string, string> = {
    school: "bg-indigo-900 text-indigo-300",
    credit_union: "bg-teal-900 text-teal-300",
    government: "bg-purple-900 text-purple-300",
    ngo: "bg-green-900 text-green-300",
    other: "bg-slate-700 text-slate-300",
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
      {editLesson && (
        <Dialog open={!!editLesson} onOpenChange={() => setEditLesson(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-xl">
            <DialogHeader><DialogTitle>Edit Lesson</DialogTitle></DialogHeader>
            <AdminEditLessonDialog orgId={org.id} lessonId={editLesson} onClose={() => setEditLesson(null)} />
          </DialogContent>
        </Dialog>
      )}
      {deleteLesson && (
        <Dialog open={!!deleteLesson} onOpenChange={() => setDeleteLesson(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
            <DialogHeader><DialogTitle>Delete Lesson?</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-1">
              <p className="text-slate-300 text-sm">
                This will permanently delete <span className="font-semibold text-white">"{deleteLesson.title}"</span> and all its quiz questions. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setDeleteLesson(null)} className="flex-1 text-slate-300 hover:text-white" data-testid="button-cancel-delete-lesson">
                  Cancel
                </Button>
                <Button onClick={() => deleteLessonMutation.mutate(deleteLesson.id)} disabled={deleteLessonMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white" data-testid="button-confirm-delete-lesson">
                  {deleteLessonMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Lesson"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${org.name?.charCodeAt(0) % 2 === 0 ? "#312e81" : "#164e63"}` }}>
          <Globe className="w-4 h-4 text-white/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white truncate" data-testid={`text-org-name-${org.id}`}>{org.name}</span>
            {org.display_label && (
              <span className="text-xs text-slate-400 font-normal">· {org.display_label}</span>
            )}
            <Badge className={`text-xs px-2 py-0 ${typeColors[org.type] ?? "bg-slate-700 text-slate-300"} capitalize`}>
              {org.type?.replace("_", " ")}
            </Badge>
            <Badge className={`text-xs px-2 py-0 ${tierColors[org.subscription_tier] ?? ""} capitalize`}>
              {org.subscription_tier}
            </Badge>
            {org.is_active
              ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Active</span>
              : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3 h-3" /> Inactive</span>}
          </div>
          <p className="text-slate-300 text-xs mt-0.5">
            {org.city ? `${org.city}, ` : ""}{org.country} · {org.max_students} students max
            {org.contact_email ? ` · ${org.contact_email}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => toggleActive.mutate()}
            className={`text-xs px-2 py-1 rounded border ${org.is_active ? "border-red-800 text-red-400 hover:bg-red-900/30" : "border-emerald-800 text-emerald-400 hover:bg-emerald-900/30"}`}
            data-testid={`button-toggle-org-${org.id}`}>
            {org.is_active ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => onEdit(org)} className="text-slate-300 hover:text-white p-1.5" data-testid={`button-edit-org-${org.id}`}>
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-300 hover:text-white p-1.5" data-testid={`button-expand-org-${org.id}`}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/40 space-y-4">
          {/* Environments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" /> Environments ({envs.length})
              </span>
              <Dialog open={envDialog} onOpenChange={setEnvDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-7" data-testid={`button-add-env-${org.id}`}>
                    <Plus className="w-3 h-3 mr-1" /> Add Environment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader><DialogTitle>New Environment for {org.name}</DialogTitle></DialogHeader>
                  <EnvDialog orgId={org.id} onClose={() => setEnvDialog(false)} />
                </DialogContent>
              </Dialog>
            </div>
            {envsLoading ? (
              <p className="text-slate-300 text-xs">Loading environments…</p>
            ) : envs.length === 0 ? (
              <p className="text-slate-300 text-xs italic">No environments yet. Add one to assign students to this organization.</p>
            ) : (
              <div className="space-y-2">
                {envs.map((env: any) => (
                  <EnvCard key={env.id} env={env} />
                ))}
              </div>
            )}
          </div>

          {/* Lesson Plans */}
          <div className="border-t border-slate-700/50 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-400" /> Lesson Plans ({lessons.length})
              </span>
              <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-teal-700 hover:bg-teal-600 text-xs h-7" data-testid={`button-add-lesson-${org.id}`}>
                    <Plus className="w-3 h-3 mr-1" /> Add Lesson
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-xl">
                  <DialogHeader><DialogTitle>New Lesson Plan for {org.name}</DialogTitle></DialogHeader>
                  <LessonPlanDialog orgId={org.id} onClose={() => setLessonDialog(false)} />
                </DialogContent>
              </Dialog>
            </div>
            {lessonsLoading ? (
              <p className="text-slate-300 text-xs">Loading lessons…</p>
            ) : lessons.length === 0 ? (
              <p className="text-slate-300 text-xs italic">No lesson plans yet. Add one to deliver curriculum to students.</p>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson: any) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <div className={`w-2 h-8 rounded-full flex-shrink-0 ${lesson.is_published ? "bg-teal-500" : "bg-slate-600"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate" data-testid={`text-lesson-title-${lesson.id}`}>{lesson.title}</p>
                      <p className="text-slate-300 text-xs">
                        {lesson.subject ? `${lesson.subject} · ` : ""}
                        {lesson.grade_level ? `Grade ${lesson.grade_level} · ` : ""}
                        {lesson.instructor || ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lesson.is_published ? "bg-teal-900/60 text-teal-300" : "bg-slate-700 text-slate-300"}`}>
                        {lesson.is_published ? "Published" : "Draft"}
                      </span>
                      <button
                        onClick={() => togglePublish.mutate({ id: lesson.id, is_published: !lesson.is_published })}
                        disabled={togglePublish.isPending}
                        className={`p-1.5 rounded transition-colors ${lesson.is_published ? "text-teal-400 hover:text-slate-300 hover:bg-slate-700" : "text-slate-300 hover:text-teal-400 hover:bg-teal-900/30"}`}
                        title={lesson.is_published ? "Unpublish" : "Publish"}
                        data-testid={`button-toggle-lesson-${lesson.id}`}
                      >
                        {lesson.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditLesson(lesson.id)}
                        className="p-1.5 rounded transition-colors text-slate-300 hover:text-indigo-400 hover:bg-indigo-900/30"
                        title="Edit lesson"
                        data-testid={`button-edit-lesson-${lesson.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteLesson(lesson)}
                        className="p-1.5 rounded transition-colors text-slate-300 hover:text-red-400 hover:bg-red-900/30"
                        title="Delete lesson"
                        data-testid={`button-delete-lesson-admin-${lesson.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main dashboard ───────────────────────────────────────────────────────────

function AiUsagePurgeCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [olderThanDays, setOlderThanDays] = useState(180);
  const [confirmed, setConfirmed] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/admin/maintenance/ai-usage-stats", olderThanDays],
    queryFn: () => apiRequest("GET", `/api/admin/maintenance/ai-usage-stats?olderThanDays=${olderThanDays}`).then(r => r.json()),
  });

  const purgeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/maintenance/purge-ai-usage", { olderThanDays }).then(r => r.json()),
    onSuccess: (data) => {
      toast({ title: "Purge job queued", description: `Job #${data.jobId} is now running in the background.` });
      setConfirmed(false);
      refetchStats();
      qc.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to queue purge", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Card className="bg-slate-800 border-slate-700" data-testid="card-ai-usage-purge">
      <CardHeader>
        <CardTitle className="text-slate-200 text-base flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-400" /> AI Usage Record Cleanup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-300 text-sm">
          AI usage events accumulate over time, one row per AI call. Delete old records to keep the table fast.
          Quota enforcement only needs the current month; trends only need a few months.
        </p>
        {statsLoading ? (
          <p className="text-slate-400 text-sm">Loading stats…</p>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">Total rows</p>
              <p className="text-slate-100 font-semibold text-lg" data-testid="text-ai-usage-total">{stats.total?.toLocaleString() ?? "-"}</p>
            </div>
            <div className="bg-red-900/30 rounded-lg p-3 border border-red-800/40">
              <p className="text-red-300 text-xs mb-1">Older than {olderThanDays} days</p>
              <p className="text-red-200 font-semibold text-lg" data-testid="text-ai-usage-purgeable">{stats.purgeable?.toLocaleString() ?? "-"}</p>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <label className="text-slate-300 text-sm whitespace-nowrap">Delete records older than</label>
          <Input
            type="number"
            min={30}
            max={3650}
            value={olderThanDays}
            onChange={e => { setOlderThanDays(parseInt(e.target.value) || 180); setConfirmed(false); }}
            className="w-24 bg-slate-900 border-slate-600 text-slate-100"
            data-testid="input-purge-days"
          />
          <span className="text-slate-300 text-sm">days</span>
        </div>
        {!confirmed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmed(true)}
            disabled={!stats || stats.purgeable === 0}
            className="border-red-700 text-red-300 hover:bg-red-900/30 disabled:opacity-40"
            data-testid="button-confirm-purge"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {stats?.purgeable === 0 ? "Nothing to purge" : `Purge ${stats?.purgeable?.toLocaleString() ?? "…"} rows`}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-red-300 text-sm">Are you sure? This cannot be undone.</span>
            <Button
              size="sm"
              onClick={() => purgeMutation.mutate()}
              disabled={purgeMutation.isPending}
              className="bg-red-700 hover:bg-red-600 text-white"
              data-testid="button-run-purge"
            >
              {purgeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Yes, delete them
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmed(false)}
              className="text-slate-300 hover:text-slate-100"
              data-testid="button-cancel-purge"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobsPanel() {
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/jobs"],
    refetchInterval: 4000,
  });
  const statusBadge = (s: string) => {
    const cls =
      s === "completed" ? "bg-emerald-700 text-emerald-100"
      : s === "failed" ? "bg-red-700 text-red-100"
      : s === "processing" ? "bg-amber-700 text-amber-100"
      : "bg-slate-700 text-slate-200";
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{s}</span>;
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Background Jobs</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/jobs"] })}
          data-testid="button-refresh-jobs"
          className="border-slate-700 text-slate-200 hover:bg-slate-700"
        >
          Refresh
        </Button>
      </div>

      <AiUsagePurgeCard />

      <div>
        <p className="text-slate-300 text-sm mb-3">Recent background work: paper extractions, CSV exports, and maintenance jobs.</p>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-slate-300 text-sm">Loading…</p>
            ) : jobs.length === 0 ? (
              <p className="p-6 text-slate-300 text-sm">No jobs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/50 text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Kind</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Attempts</th>
                      <th className="px-3 py-2 text-left">Scheduled</th>
                      <th className="px-3 py-2 text-left">Completed</th>
                      <th className="px-3 py-2 text-left">Last error</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j: any) => (
                      <tr key={j.id} className="border-t border-slate-700 text-slate-100" data-testid={`row-job-${j.id}`}>
                        <td className="px-3 py-2 font-mono">{j.id}</td>
                        <td className="px-3 py-2">{j.kind}</td>
                        <td className="px-3 py-2">{statusBadge(j.status)}</td>
                        <td className="px-3 py-2">{j.attempts}/{j.maxAttempts}</td>
                        <td className="px-3 py-2 text-slate-300">{fmtDate(j.scheduledAt)}</td>
                        <td className="px-3 py-2 text-slate-300">{j.completedAt ? fmtDate(j.completedAt) : "-"}</td>
                        <td className="px-3 py-2 text-red-300 max-w-xs truncate" title={j.lastError || ""}>{j.lastError || "-"}</td>
                        <td className="px-3 py-2">
                          {j.kind === "admin-csv-export" && j.status === "completed" && (
                            <a
                              href={`/api/admin/exports/${j.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-300 hover:text-indigo-100 underline text-xs"
                              data-testid={`link-download-job-${j.id}`}
                            >
                              Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── PerfAgentPanel ─────────────────────────────────────────────────────────
interface ReportMeta { name: string; sizeBytes: number; createdMs: number; }
interface ReportDetail { name: string; content: string; }

function parseSeverityFromReport(md: string): { critical: number; warning: number; info: number } {
  const critMatch = md.match(/\*\*Issues:\*\*\s*(\d+)\s*critical/);
  const warnMatch = md.match(/(\d+)\s*warnings/);
  const infoMatch = md.match(/(\d+)\s*info/);
  return {
    critical: critMatch ? parseInt(critMatch[1]) : 0,
    warning: warnMatch ? parseInt(warnMatch[1]) : 0,
    info: infoMatch ? parseInt(infoMatch[1]) : 0,
  };
}

function friendlyReportName(name: string): string {
  // "2026-05-12T08-30-00-scan.md" → "May 12, 2026 08:30:00"
  const m = name.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-scan/);
  if (!m) return name;
  const [, yr, mo, dy, hr, mn, sc] = m;
  const d = new Date(`${yr}-${mo}-${dy}T${hr}:${mn}:${sc}Z`);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function MarkdownView({ content }: { content: string }) {
  // Minimal markdown → JSX renderer (no external dep needed)
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let key = 0;
  for (const line of lines) {
    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-2xl font-bold text-white mb-3 mt-2">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-lg font-semibold text-white mt-6 mb-2 border-b border-slate-600 pb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-base font-semibold text-slate-200 mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={key++} className="border-slate-700 my-3" />);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<li key={key++} className="text-slate-300 text-sm ml-4 list-disc">{line.slice(2)}</li>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={key++} className="font-semibold text-slate-200 text-sm">{line.replace(/\*\*/g, "")}</p>);
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-1" />);
    } else {
      // Inline bold: **text**
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={key++} className="text-slate-300 text-sm">
          {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-slate-100">{p}</strong> : p)}
        </p>
      );
    }
  }
  return <div className="space-y-0.5">{elements}</div>;
}

function PerfAgentPanel() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const { data: reports = [], isLoading: reportsLoading, refetch: refetchList } = useQuery<ReportMeta[]>({
    queryKey: ["/api/admin/perf-reports"],
  });

  const { data: reportDetail, isLoading: detailLoading } = useQuery<ReportDetail>({
    queryKey: ["/api/admin/perf-reports", selectedReport],
    enabled: !!selectedReport,
  });

  const triggerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/perf-scan"),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/perf-reports"] });
      }, 3000);
    },
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Performance Intelligence Agent
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Claude-powered scanner that analyses 6 core files for performance, reliability, and security issues.
            Runs automatically every hour and saves reports here.
          </p>
        </div>
        <Button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold gap-2"
          data-testid="button-trigger-perf-scan"
        >
          {triggerMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Queuing scan…</>
            : <><Play className="w-4 h-4" /> Run Scan Now</>}
        </Button>
      </div>

      {triggerMutation.isSuccess && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg px-4 py-3 text-yellow-300 text-sm flex items-center gap-2" data-testid="banner-scan-queued">
          <Clock className="w-4 h-4 flex-shrink-0" />
          Scan job queued! Claude is analysing 6 files, this takes ~20-40 seconds. The new report will appear in the list below.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Reports list */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Reports ({reports.length})</h3>
            <Button
              size="sm" variant="ghost"
              onClick={() => refetchList()}
              className="text-slate-400 hover:text-white gap-1"
              data-testid="button-refresh-perf-reports"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>

          {reportsLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading reports…
            </div>
          )}

          {!reportsLoading && reports.length === 0 && (
            <div className="bg-slate-800 rounded-lg p-4 text-slate-400 text-sm text-center" data-testid="text-no-perf-reports">
              No reports yet. Run a scan to generate the first one.
            </div>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {reports.map((r) => {
              const isSelected = selectedReport === r.name;
              return (
                <button
                  key={r.name}
                  onClick={() => setSelectedReport(r.name)}
                  data-testid={`button-select-report-${r.name}`}
                  className={`w-full text-left rounded-lg p-3 transition-colors border ${
                    isSelected
                      ? "bg-yellow-900/40 border-yellow-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <div className="text-xs font-medium truncate">{friendlyReportName(r.name)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {(r.sizeBytes / 1024).toFixed(1)} KB
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report detail */}
        <div className="lg:col-span-2">
          {!selectedReport && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-500 text-sm h-full flex flex-col items-center justify-center gap-3" data-testid="text-select-report-prompt">
              <Zap className="w-8 h-8 text-slate-600" />
              Select a report to view its findings
            </div>
          )}

          {selectedReport && detailLoading && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 flex items-center justify-center gap-3 text-slate-400" data-testid="text-report-loading">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading report…
            </div>
          )}

          {selectedReport && reportDetail && !detailLoading && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden" data-testid="container-report-detail">
              {/* Severity badges */}
              {(() => {
                const sev = parseSeverityFromReport(reportDetail.content);
                return (
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-900/60 flex-wrap">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
                      {friendlyReportName(reportDetail.name)}
                    </span>
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                      {sev.critical > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/40 text-red-300 dark:bg-red-900/40 dark:text-red-300" data-testid="badge-critical-count">
                          <AlertTriangle className="w-3 h-3" /> {sev.critical} critical
                        </span>
                      )}
                      {sev.warning > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/40 text-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300" data-testid="badge-warning-count">
                          <AlertTriangle className="w-3 h-3" /> {sev.warning} warnings
                        </span>
                      )}
                      {sev.info > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-300 dark:bg-blue-900/40 dark:text-blue-300" data-testid="badge-info-count">
                          <Info className="w-3 h-3" /> {sev.info} info
                        </span>
                      )}
                      <a
                        href={`/api/admin/perf-reports/${reportDetail.name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-white underline ml-1"
                        data-testid="link-raw-report"
                      >
                        raw ↗
                      </a>
                    </div>
                  </div>
                );
              })()}
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                <MarkdownView content={reportDetail.content} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { admin, isLoading, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingTiers, setPendingTiers] = useState<Record<string, string>>({});
  const [schoolDialog, setSchoolDialog] = useState<{ open: boolean; existing?: any }>({ open: false });
  const [sponsorDialog, setSponsorDialog] = useState<{ open: boolean; existing?: any }>({ open: false });
  const [orgDialog, setOrgDialog] = useState<{ open: boolean; existing?: any }>({ open: false });
  const [dbTable, setDbTable] = useState("users");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: overview } = useQuery<any>({ queryKey: ["/api/admin/overview"], enabled: !!admin });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/admin/students"], enabled: !!admin && (activeTab === "students" || activeTab === "reports") });
  const { data: teachers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/teachers"], enabled: !!admin && (activeTab === "teachers" || activeTab === "reports") });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/admin/classes"], enabled: !!admin && activeTab === "classes" });
  const { data: challenges = [] } = useQuery<any[]>({ queryKey: ["/api/admin/challenges"], enabled: !!admin && activeTab === "challenges" });
  const { data: schools = [] } = useQuery<any[]>({ queryKey: ["/api/admin/schools"], enabled: !!admin });
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/organizations"],
    queryFn: () => apiRequest("GET", "/api/admin/organizations").then(r => r.json()),
    enabled: !!admin && activeTab === "organizations",
  });
  const { data: allOrgEnvs = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/org-envs"],
    queryFn: () => apiRequest("GET", "/api/admin/org-envs").then(r => r.json()),
    enabled: !!admin && (activeTab === "teachers" || activeTab === "classes"),
  });
  const { data: supabaseStatus } = useQuery<any>({
    queryKey: ["/api/supabase/status"],
    queryFn: () => apiRequest("GET", "/api/supabase/status").then(r => r.json()),
    enabled: !!admin && activeTab === "organizations",
    staleTime: 30000,
  });
  const { data: sponsors = [] } = useQuery<any[]>({ queryKey: ["/api/admin/sponsors"], enabled: !!admin });
  const { data: growth = [] } = useQuery<any[]>({ queryKey: ["/api/admin/charts/growth"], enabled: !!admin && activeTab === "overview" });
  const { data: lessonsChart = [] } = useQuery<any[]>({ queryKey: ["/api/admin/charts/lessons"], enabled: !!admin && activeTab === "overview" });
  const { data: schoolsChart = [] } = useQuery<any[]>({ queryKey: ["/api/admin/charts/schools"], enabled: !!admin && activeTab === "overview" });
  const { data: dbRows = [] } = useQuery<any[]>({ queryKey: ["/api/admin/db", dbTable], queryFn: () => apiRequest("GET", `/api/admin/db/${dbTable}`).then(r => r.json()), enabled: !!admin && activeTab === "dbviewer" });
  const { data: pendingOrgs = [], isLoading: pendingOrgsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/organizations/pending"],
    queryFn: () => apiRequest("GET", "/api/admin/organizations/pending").then(r => r.json()),
    enabled: !!admin && activeTab === "pending",
  });

  const deleteSchool = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/schools/${id}`).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/schools"] }); toast({ title: "School deleted" }); },
  });

  const approveOrg = useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: string }) =>
      apiRequest("POST", `/api/admin/organizations/${id}/approve`, { tier }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/organizations/pending"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({ title: "Organization approved" });
    },
    onError: (e: any) => toast({ title: "Approval failed", description: e.message, variant: "destructive" }),
  });

  const rejectOrg = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/admin/organizations/${id}/reject`).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/organizations/pending"] });
      toast({ title: "Organization rejected" });
    },
    onError: (e: any) => toast({ title: "Rejection failed", description: e.message, variant: "destructive" }),
  });
  const deleteSponsor = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/sponsors/${id}`).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/sponsors"] }); toast({ title: "Sponsor deleted" }); },
  });
  const linkTeacherOrg = useMutation({
    mutationFn: ({ teacherId, env_id }: { teacherId: number; env_id: string | null }) =>
      apiRequest("PATCH", `/api/admin/teachers/${teacherId}/org-link`, { env_id }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/teachers"] }); toast({ title: "Teacher linked to org environment" }); },
    onError: (e: any) => toast({ title: "Link failed", description: e.message, variant: "destructive" }),
  });
  const linkClassEnv = useMutation({
    mutationFn: ({ classId, env_id }: { classId: number; env_id: string | null }) =>
      apiRequest("PATCH", `/api/admin/classes/${classId}/org-link`, { env_id }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/classes"] }); toast({ title: "Class linked to org environment" }); },
    onError: (e: any) => toast({ title: "Link failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><p className="text-slate-300">Loading...</p></div>;
  if (!admin) { setLocation("/admin/login"); return null; }

  const downloadCSV = async (type: string) => {
    try {
      const res = await apiRequest("POST", `/api/admin/exports/${type}`);
      const { jobId } = (await res.json()) as { jobId: number };
      toast({ title: "Export queued", description: `Preparing ${type}.csv in the background…` });
      qc.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      const start = Date.now();
      // poll for up to 5 minutes
      while (Date.now() - start < 5 * 60_000) {
        await new Promise((r) => setTimeout(r, 2000));
        const j = await apiRequest("GET", `/api/jobs/${jobId}`).then((r) => r.json());
        qc.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
        if (j.status === "completed") {
          window.open(`/api/admin/exports/${jobId}/download`, "_blank");
          toast({ title: "Export ready", description: `${type}.csv downloaded.` });
          return;
        }
        if (j.status === "failed") {
          toast({ title: "Export failed", description: j.lastError || "Unknown error", variant: "destructive" });
          return;
        }
      }
      toast({ title: "Still working", description: "Check the Background Jobs tab to download when ready." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  const dbTables = ["users", "teachers", "classes", "classEnrollments", "challenges", "classNotifications", "schools", "sponsors", "gameSessions", "userXp", "userBadges", "userLearningProgress"];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:block">FinSight Admin</span>
        </div>
        <GlobalSearch />
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          <span className="text-slate-300 text-sm hidden md:block">{admin.email}</span>
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()}
            className="text-slate-300 hover:text-white hover:bg-slate-700" data-testid="button-admin-logout">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="bg-slate-800/50 border-b border-slate-700 px-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-indigo-400 text-indigo-300"
                    : "border-transparent text-slate-300 hover:text-white hover:border-slate-500"
                }`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="p-6 max-w-[1600px] mx-auto">

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Platform Overview</h2>
            <ObservabilityCard />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="Total Students" value={overview?.totalStudents ?? "-"} icon={Users} color="bg-violet-600" />
              <MetricCard label="Total Teachers" value={overview?.totalTeachers ?? "-"} icon={GraduationCap} color="bg-emerald-600" />
              <MetricCard label="Total Classes" value={overview?.totalClasses ?? "-"} icon={BookOpen} color="bg-blue-600" />
              <MetricCard label="Active Challenges" value={overview?.totalChallenges ?? "-"} icon={Trophy} color="bg-amber-600" />
              <MetricCard label="Total Schools" value={overview?.totalSchools ?? "-"} icon={School} color="bg-pink-600" />
              <MetricCard label="Total Sponsors" value={overview?.totalSponsors ?? "-"} icon={Coins} color="bg-teal-600" />
              <MetricCard label="Enrollments" value={overview?.totalEnrollments ?? "-"} icon={Users} color="bg-indigo-600" />
              <MetricCard label="Games Played" value={overview?.totalGames ?? "-"} icon={Trophy} color="bg-rose-600" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
                <CardHeader><CardTitle className="text-slate-200 text-base">Student Growth (by week)</CardTitle></CardHeader>
                <CardContent>
                  {growth.length === 0 ? <p className="text-slate-300 text-sm text-center py-8">No data yet</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={growth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="week" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
                        <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
                <CardHeader><CardTitle className="text-slate-200 text-base">Games Played / Week</CardTitle></CardHeader>
                <CardContent>
                  {lessonsChart.length === 0 ? <p className="text-slate-300 text-sm text-center py-8">No data yet</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={lessonsChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="week" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
                <CardHeader><CardTitle className="text-slate-200 text-base">Most Active Schools</CardTitle></CardHeader>
                <CardContent>
                  {schoolsChart.length === 0 ? <p className="text-slate-300 text-sm text-center py-8">No data yet</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={schoolsChart} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: "#cbd5e1", fontSize: 10 }} width={80} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                        <Bar dataKey="students" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Organizations (Supabase) ── */}
        {activeTab === "organizations" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Globe className="w-6 h-6 text-indigo-400" /> Organizations
                </h2>
                <p className="text-slate-300 text-sm mt-0.5">Schools, credit unions and other partner organizations (powered by Supabase)</p>
              </div>
              <div className="flex items-center gap-3">
                {supabaseStatus && (
                  <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${supabaseStatus.connected ? "border-emerald-700 bg-emerald-900/30 text-emerald-400" : "border-red-800 bg-red-900/20 text-red-400"}`}
                    data-testid="text-supabase-status">
                    {supabaseStatus.connected
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Supabase connected</>
                      : <><XCircle className="w-3.5 h-3.5" /> {supabaseStatus.error || "Not connected"}</>}
                  </div>
                )}
                <Dialog open={orgDialog.open && !orgDialog.existing} onOpenChange={o => setOrgDialog(o ? { open: true } : { open: false })}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-add-org">
                      <Plus className="w-4 h-4 mr-1" /> Add Organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
                    <DialogHeader><DialogTitle>New Organization</DialogTitle></DialogHeader>
                    <OrgDialog onClose={() => setOrgDialog({ open: false })} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {!supabaseStatus?.connected && supabaseStatus !== undefined && (
              <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
                <strong>Supabase tables not found.</strong> Please run the SQL setup in your Supabase SQL Editor first (as shared in chat), then refresh this page.
              </div>
            )}

            {orgsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-800 animate-pulse" />)}
              </div>
            ) : organizations.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-10 text-center">
                <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-300 font-medium">No organizations yet</p>
                <p className="text-slate-300 text-sm mt-1">Add a school or organization to start managing their student environments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-4 text-sm text-slate-300 px-1">
                  <span><strong className="text-white">{organizations.length}</strong> total</span>
                  <span><strong className="text-emerald-400">{organizations.filter((o: any) => o.is_active).length}</strong> active</span>
                  <span><strong className="text-amber-400">{organizations.filter((o: any) => o.subscription_tier === "institution").length}</strong> institution</span>
                </div>
                {organizations.map((org: any) => (
                  <div key={org.id}>
                    <OrgCard org={org} onEdit={o => setOrgDialog({ open: true, existing: o })} />
                  </div>
                ))}
              </div>
            )}

            <Dialog open={orgDialog.open && !!orgDialog.existing} onOpenChange={o => setOrgDialog(o ? orgDialog : { open: false })}>
              <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
                <DialogHeader><DialogTitle>Edit Organization</DialogTitle></DialogHeader>
                {orgDialog.existing && <OrgDialog existing={orgDialog.existing} onClose={() => setOrgDialog({ open: false })} />}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ── Schools ── */}
        {activeTab === "schools" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Schools</h2>
              <div className="flex gap-2">
                <Button onClick={() => downloadCSV("schools")} variant="outline"
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-sm" data-testid="button-download-schools">
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Dialog open={schoolDialog.open} onOpenChange={o => setSchoolDialog({ open: o })}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-sm" data-testid="button-add-school">
                      <Plus className="w-4 h-4 mr-1" /> Add School
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white">
                    <DialogHeader><DialogTitle>Add School</DialogTitle></DialogHeader>
                    <SchoolDialog onClose={() => setSchoolDialog({ open: false })} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <DataTable
              data={schools}
              searchKeys={["name", "country", "city"]}
              columns={[
                { key: "name", label: "School Name" },
                { key: "country", label: "Country" },
                { key: "city", label: "City", render: v => v || "-" },
                { key: "website", label: "Website", render: v => v ? <a href={v} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">{v}</a> : "-" },
                { key: "createdAt", label: "Date Added", render: v => fmtDate(v) },
                { key: "id", label: "Actions", render: (v, row) => (
                  <div className="flex gap-2">
                    <Dialog open={schoolDialog.open && schoolDialog.existing?.id === v} onOpenChange={o => setSchoolDialog(o ? { open: true, existing: row } : { open: false })}>
                      <DialogTrigger asChild>
                        <button className="text-slate-300 hover:text-white p-1" data-testid={`button-edit-school-${v}`}><Pencil className="w-4 h-4" /></button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-800 border-slate-700 text-white">
                        <DialogHeader><DialogTitle>Edit School</DialogTitle></DialogHeader>
                        <SchoolDialog existing={row} onClose={() => setSchoolDialog({ open: false })} />
                      </DialogContent>
                    </Dialog>
                    <button onClick={() => deleteSchool.mutate(v)} className="text-red-400 hover:text-red-300 p-1" data-testid={`button-delete-school-${v}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                )},
              ]}
            />
          </div>
        )}

        {/* ── Teachers ── */}
        {activeTab === "teachers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Teachers</h2>
              <Button onClick={() => downloadCSV("teachers")} variant="outline"
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-sm" data-testid="button-download-teachers">
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            </div>
            <DataTable
              data={teachers}
              searchKeys={["firstName", "lastName", "email", "schoolName"]}
              columns={[
                { key: "firstName", label: "First Name" },
                { key: "lastName", label: "Last Name" },
                { key: "email", label: "Email" },
                { key: "schoolName", label: "School" },
                { key: "classCount", label: "Classes", render: v => <Badge className="bg-indigo-900 text-indigo-300">{v}</Badge> },
                { key: "studentCount", label: "Students", render: v => <Badge className="bg-violet-900 text-violet-300">{v}</Badge> },
                { key: "createdAt", label: "Joined", render: v => fmtDate(v) },
                {
                  key: "id",
                  label: "Org Environment",
                  render: (_v, row) => (
                    <Select
                      value={row.envId ?? "none"}
                      onValueChange={(val) => {
                        linkTeacherOrg.mutate({
                          teacherId: row.id,
                          env_id: val === "none" ? null : val,
                        });
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200 h-8 text-xs w-44" data-testid={`select-teacher-org-${row.id}`}>
                        <SelectValue placeholder="Unlinked" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                        <SelectItem value="none" className="text-slate-300 text-xs">Unlinked</SelectItem>
                        {allOrgEnvs.map((env: any) => (
                          <SelectItem key={env.id} value={env.id} className="text-xs">
                            {env.org_name}: {env.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* ── Students ── */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Students</h2>
              <Button onClick={() => downloadCSV("students")} variant="outline"
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-sm" data-testid="button-download-students">
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            </div>
            <DataTable
              data={students}
              searchKeys={["studentName", "username", "className", "schoolName", "teacherName"]}
              columns={[
                { key: "studentName", label: "Student Name" },
                { key: "username", label: "Username", render: v => <span className="text-slate-300 text-xs font-mono">{v}</span> },
                { key: "className", label: "Class" },
                { key: "schoolName", label: "School" },
                { key: "teacherName", label: "Teacher" },
                { key: "lessonsCompleted", label: "Lessons", render: v => <span className="font-semibold">{v}/6</span> },
                { key: "quizScore", label: "Quiz Score", render: v => (
                  <span className={`font-semibold ${v >= 70 ? "text-emerald-400" : v >= 50 ? "text-amber-400" : "text-red-400"}`}>{v}%</span>
                )},
                { key: "simulatorScore", label: "XP", render: v => <span className="text-violet-400 font-semibold">{v} XP</span> },
                { key: "level", label: "Level", render: v => <Badge className="bg-amber-900 text-amber-300">Lv {v}</Badge> },
                { key: "gamesPlayed", label: "Games" },
                { key: "joinedAt", label: "Joined", render: v => fmtDate(v) },
              ]}
            />
          </div>
        )}

        {/* ── Classes ── */}
        {activeTab === "classes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Classes</h2>
              <Button onClick={() => downloadCSV("classes")} variant="outline"
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-sm" data-testid="button-download-classes">
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            </div>
            <DataTable
              data={classes}
              searchKeys={["name", "subject", "code", "teacherName", "schoolName"]}
              columns={[
                { key: "name", label: "Class Name" },
                { key: "subject", label: "Subject" },
                { key: "code", label: "Code", render: v => <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-sm text-amber-300">{v}</span> },
                { key: "teacherName", label: "Teacher" },
                { key: "schoolName", label: "School" },
                { key: "studentCount", label: "Students", render: v => <Badge className="bg-violet-900 text-violet-300">{v}</Badge> },
                { key: "challengeCount", label: "Challenges" },
                { key: "sponsorName", label: "Sponsor", render: v => v || "-" },
                { key: "createdAt", label: "Created", render: v => fmtDate(v) },
                {
                  key: "id",
                  label: "Org Environment",
                  render: (_v, row) => (
                    <Select
                      value={row.envId ?? "none"}
                      onValueChange={(val) => {
                        linkClassEnv.mutate({
                          classId: row.id,
                          env_id: val === "none" ? null : val,
                        });
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200 h-8 text-xs w-44" data-testid={`select-class-org-${row.id}`}>
                        <SelectValue placeholder="Unlinked" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                        <SelectItem value="none" className="text-slate-300 text-xs">Unlinked</SelectItem>
                        {allOrgEnvs.map((env: any) => (
                          <SelectItem key={env.id} value={env.id} className="text-xs">
                            {env.org_name}: {env.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* ── Sponsors ── */}
        {activeTab === "sponsors" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Sponsors</h2>
              <div className="flex gap-2">
                <Button onClick={() => downloadCSV("sponsors")} variant="outline"
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-sm" data-testid="button-download-sponsors">
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Dialog open={sponsorDialog.open} onOpenChange={o => setSponsorDialog({ open: o })}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-sm" data-testid="button-add-sponsor">
                      <Plus className="w-4 h-4 mr-1" /> Add Sponsor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white">
                    <DialogHeader><DialogTitle>Add Sponsor</DialogTitle></DialogHeader>
                    <SponsorDialog onClose={() => setSponsorDialog({ open: false })} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <DataTable
              data={sponsors}
              searchKeys={["name", "type", "contactName", "contactEmail", "country"]}
              columns={[
                { key: "name", label: "Sponsor Name" },
                { key: "type", label: "Type", render: v => <Badge className="bg-teal-900 text-teal-300 capitalize">{String(v).replace("_", " ")}</Badge> },
                { key: "contactName", label: "Contact", render: v => v || "-" },
                { key: "contactEmail", label: "Email", render: v => v || "-" },
                { key: "country", label: "Country" },
                { key: "website", label: "Website", render: v => v ? <a href={v} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">{v}</a> : "-" },
                { key: "createdAt", label: "Added", render: v => fmtDate(v) },
                { key: "id", label: "Actions", render: (v, row) => (
                  <div className="flex gap-2">
                    <Dialog open={sponsorDialog.open && sponsorDialog.existing?.id === v} onOpenChange={o => setSponsorDialog(o ? { open: true, existing: row } : { open: false })}>
                      <DialogTrigger asChild>
                        <button className="text-slate-300 hover:text-white p-1" data-testid={`button-edit-sponsor-${v}`}><Pencil className="w-4 h-4" /></button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-800 border-slate-700 text-white">
                        <DialogHeader><DialogTitle>Edit Sponsor</DialogTitle></DialogHeader>
                        <SponsorDialog existing={row} onClose={() => setSponsorDialog({ open: false })} />
                      </DialogContent>
                    </Dialog>
                    <button onClick={() => deleteSponsor.mutate(v)} className="text-red-400 hover:text-red-300 p-1" data-testid={`button-delete-sponsor-${v}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                )},
              ]}
            />
          </div>
        )}

        {/* ── Challenges ── */}
        {activeTab === "challenges" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Challenges</h2>
            <DataTable
              data={challenges}
              searchKeys={["title", "type", "className", "teacherName"]}
              columns={[
                { key: "title", label: "Title" },
                { key: "type", label: "Type", render: v => <Badge className="bg-amber-900 text-amber-300 capitalize">{v}</Badge> },
                { key: "className", label: "Class" },
                { key: "teacherName", label: "Teacher" },
                { key: "description", label: "Description", render: v => <span className="text-slate-300 text-xs">{String(v).slice(0, 60)}{String(v).length > 60 ? "..." : ""}</span> },
                { key: "startDate", label: "Start", render: v => fmtDate(v) },
                { key: "endDate", label: "End", render: v => fmtDate(v) },
                { key: "targetValue", label: "Target", render: v => v ? `$${v}` : "-" },
                { key: "createdAt", label: "Created", render: v => fmtDate(v) },
              ]}
            />
          </div>
        )}

        {/* ── Reports ── */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { type: "students", label: "Student Progress Report", desc: "All students with XP, lessons, quiz scores, class & school", icon: Users, color: "bg-violet-600" },
                { type: "teachers", label: "Teachers Report", desc: "All teachers with school, class count, and student count", icon: GraduationCap, color: "bg-emerald-600" },
                { type: "classes", label: "Classes Report", desc: "All classes with teacher, enrollment, and challenge count", icon: BookOpen, color: "bg-blue-600" },
                { type: "schools", label: "Schools Report", desc: "All registered schools with country and website", icon: School, color: "bg-pink-600" },
                { type: "sponsors", label: "Sponsors Report", desc: "All sponsors with contact details and type", icon: Coins, color: "bg-teal-600" },
              ].map(r => {
                const Icon = r.icon;
                return (
                  <Card key={r.type} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                    <CardContent className="p-5">
                      <div className={`w-10 h-10 ${r.color} rounded-lg flex items-center justify-center mb-3`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">{r.label}</h3>
                      <p className="text-slate-300 text-sm mb-4">{r.desc}</p>
                      <Button onClick={() => downloadCSV(r.type)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm" data-testid={`button-report-${r.type}`}>
                        <Download className="w-4 h-4 mr-1" /> Download CSV
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-5">
                <h3 className="font-semibold text-white mb-2">Quick Stats Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-slate-200 font-medium">Total Students</p><p className="text-white font-bold text-xl">{students.length}</p></div>
                  <div><p className="text-slate-200 font-medium">Total Teachers</p><p className="text-white font-bold text-xl">{teachers.length}</p></div>
                  <div><p className="text-slate-200 font-medium">Avg Quiz Score</p><p className="text-emerald-400 font-bold text-xl">{students.length > 0 ? Math.round(students.reduce((s: number, st: any) => s + st.quizScore, 0) / students.length) : 0}%</p></div>
                  <div><p className="text-slate-200 font-medium">Avg Lessons Done</p><p className="text-violet-400 font-bold text-xl">{students.length > 0 ? (students.reduce((s: number, st: any) => s + st.lessonsCompleted, 0) / students.length).toFixed(1) : 0}/6</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Background Jobs ── */}
        {activeTab === "jobs" && <JobsPanel />}

        {/* ── Perf Agent ── */}
        {activeTab === "perf" && <PerfAgentPanel />}

        {/* ── Audit Log ── */}
        {activeTab === "audit" && <AuditLogPanel />}

        {/* ── DB Viewer ── */}
        {activeTab === "dbviewer" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-2xl font-bold">Database Viewer</h2>
              <Select value={dbTable} onValueChange={setDbTable}>
                <SelectTrigger className="w-56 bg-slate-800 border-slate-700 text-white" data-testid="select-db-table">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {dbTables.map(t => (
                    <SelectItem key={t} value={t} className="text-white hover:bg-slate-700">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-slate-300 text-sm">Viewing table: <span className="text-indigo-400 font-mono">{dbTable}</span> ({dbRows.length} rows, max 500)</p>
            {dbRows.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 text-center text-slate-300">No records in this table</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 border-b border-slate-700">
                      {Object.keys(dbRows[0]).map(col => (
                        <th key={col} className="text-left px-3 py-2.5 text-slate-300 font-semibold whitespace-nowrap font-mono">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dbRows.slice(0, 200).map((row, i) => (
                      <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
                        {Object.values(row).map((v: any, j) => (
                          <td key={j} className="px-3 py-2 text-slate-300 whitespace-nowrap font-mono max-w-[200px] truncate">
                            {v === null ? <span className="text-slate-600">null</span> : v instanceof Date ? fmtDate(v) : typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="space-y-6" data-testid="section-pending-orgs">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-slate-100">Pending Applications</h2>
            </div>
            {pendingOrgsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
            ) : pendingOrgs.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                <p className="font-semibold">No pending applications</p>
                <p className="text-sm mt-1">All organizations have been reviewed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrgs.map((org: any) => (
                  <div key={org.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4" data-testid={`card-pending-org-${org.id}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-bold text-slate-100 text-lg" data-testid={`text-pending-org-name-${org.id}`}>{org.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs capitalize">{org.type?.replace(/_/g, " ")}</Badge>
                          <span className="text-slate-400 text-sm">{org.country}{org.city ? `, ${org.city}` : ""}</span>
                          <span className="text-slate-500 text-xs">Applied {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}</span>
                        </div>
                      </div>
                    </div>
                    {(org.contact_name || org.contact_email) && (
                      <div className="text-sm text-slate-300 space-y-1">
                        {org.contact_name && <div><span className="text-slate-500">Contact: </span>{org.contact_name}</div>}
                        {org.contact_email && <div><span className="text-slate-500">Email: </span><a href={`mailto:${org.contact_email}`} className="text-indigo-400 hover:underline">{org.contact_email}</a></div>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-wrap pt-1">
                      <select
                        className="rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={pendingTiers[org.id] ?? "starter"}
                        onChange={e => setPendingTiers(prev => ({ ...prev, [org.id]: e.target.value }))}
                        data-testid={`select-tier-${org.id}`}
                      >
                        <option value="starter">Starter</option>
                        <option value="academy">Academy</option>
                        <option value="institution">Institution</option>
                      </select>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={approveOrg.isPending}
                        onClick={() => approveOrg.mutate({ id: org.id, tier: pendingTiers[org.id] ?? "starter" })}
                        data-testid={`button-approve-${org.id}`}
                      >
                        {approveOrg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={rejectOrg.isPending}
                        onClick={() => { if (confirm(`Reject application from ${org.name}?`)) rejectOrg.mutate(org.id); }}
                        data-testid={`button-reject-${org.id}`}
                      >
                        {rejectOrg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      <AdminHelpChat />
    </main>
    </div>
  );
}
