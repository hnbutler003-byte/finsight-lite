import { useState, useMemo } from "react";
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
  LayoutDashboard, BookOpen, X
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const TABS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "schools", label: "Schools", icon: School },
  { id: "teachers", label: "Teachers", icon: GraduationCap },
  { id: "students", label: "Students", icon: Users },
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "sponsors", label: "Sponsors", icon: Coins },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "reports", label: "Reports", icon: Download },
  { id: "dbviewer", label: "DB Viewer", icon: Building2 },
];

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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="pl-8 h-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
            data-testid="input-table-search"
          />
        </div>
        <span className="text-slate-500 text-sm">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
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
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">No records found</td></tr>
            ) : paginated.map((row, i) => (
              <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs">Page {page} of {totalPages}</span>
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
          <p className="text-slate-400 text-sm">{label}</p>
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
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 z-10" />
      <Input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search students, teachers, schools, sponsors..."
        className="pl-9 pr-8 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 w-full"
        data-testid="input-global-search"
      />
      {q && <button onClick={() => { setQ(""); setOpen(false); }} className="absolute right-3 top-2.5 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>}
      {open && q.length > 1 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-72 overflow-y-auto">
          {allResults.length === 0 ? (
            <p className="px-4 py-3 text-slate-500 text-sm">No results found</p>
          ) : allResults.map((r, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase ${typeColor[r.type]}`}>{r.type}</span>
              <span className="text-white text-sm">{r.name}</span>
              {r.email && <span className="text-slate-400 text-xs">{r.email}</span>}
              {r.school && <span className="text-slate-400 text-xs">• {r.school}</span>}
              {r.code && <span className="text-slate-400 text-xs">• Code: {r.code}</span>}
              {r.country && <span className="text-slate-400 text-xs">• {r.country}</span>}
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

// ─── main dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { admin, isLoading, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [schoolDialog, setSchoolDialog] = useState<{ open: boolean; existing?: any }>({ open: false });
  const [sponsorDialog, setSponsorDialog] = useState<{ open: boolean; existing?: any }>({ open: false });
  const [dbTable, setDbTable] = useState("users");
  const qc = useQueryClient();
  const { toast } = useToast();

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  if (!admin) { setLocation("/admin/login"); return null; }

  const { data: overview } = useQuery<any>({ queryKey: ["/api/admin/overview"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/admin/students"], enabled: activeTab === "students" || activeTab === "reports" });
  const { data: teachers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/teachers"], enabled: activeTab === "teachers" || activeTab === "reports" });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/admin/classes"], enabled: activeTab === "classes" });
  const { data: challenges = [] } = useQuery<any[]>({ queryKey: ["/api/admin/challenges"], enabled: activeTab === "challenges" });
  const { data: schools = [] } = useQuery<any[]>({ queryKey: ["/api/admin/schools"] });
  const { data: sponsors = [] } = useQuery<any[]>({ queryKey: ["/api/admin/sponsors"] });
  const { data: growth = [] } = useQuery<any[]>({ queryKey: ["/api/admin/charts/growth"], enabled: activeTab === "overview" });
  const { data: lessonsChart = [] } = useQuery<any[]>({ queryKey: ["/api/admin/charts/lessons"], enabled: activeTab === "overview" });
  const { data: schoolsChart = [] } = useQuery<any[]>({ queryKey: ["/api/admin/charts/schools"], enabled: activeTab === "overview" });
  const { data: dbRows = [] } = useQuery<any[]>({ queryKey: ["/api/admin/db", dbTable], queryFn: () => apiRequest("GET", `/api/admin/db/${dbTable}`).then(r => r.json()), enabled: activeTab === "dbviewer" });

  const deleteSchool = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/schools/${id}`).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/schools"] }); toast({ title: "School deleted" }); },
  });
  const deleteSponsor = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/sponsors/${id}`).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/sponsors"] }); toast({ title: "Sponsor deleted" }); },
  });

  const downloadCSV = (type: string) => {
    window.open(`/api/admin/reports/${type}.csv`, "_blank");
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
          <span className="text-slate-400 text-sm hidden md:block">{admin.email}</span>
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()}
            className="text-slate-400 hover:text-white hover:bg-slate-700" data-testid="button-admin-logout">
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
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="Total Students" value={overview?.totalStudents ?? "—"} icon={Users} color="bg-violet-600" />
              <MetricCard label="Total Teachers" value={overview?.totalTeachers ?? "—"} icon={GraduationCap} color="bg-emerald-600" />
              <MetricCard label="Total Classes" value={overview?.totalClasses ?? "—"} icon={BookOpen} color="bg-blue-600" />
              <MetricCard label="Active Challenges" value={overview?.totalChallenges ?? "—"} icon={Trophy} color="bg-amber-600" />
              <MetricCard label="Total Schools" value={overview?.totalSchools ?? "—"} icon={School} color="bg-pink-600" />
              <MetricCard label="Total Sponsors" value={overview?.totalSponsors ?? "—"} icon={Coins} color="bg-teal-600" />
              <MetricCard label="Enrollments" value={overview?.totalEnrollments ?? "—"} icon={Users} color="bg-indigo-600" />
              <MetricCard label="Games Played" value={overview?.totalGames ?? "—"} icon={Trophy} color="bg-rose-600" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
                <CardHeader><CardTitle className="text-slate-200 text-base">Student Growth (by week)</CardTitle></CardHeader>
                <CardContent>
                  {growth.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No data yet</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={growth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
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
                  {lessonsChart.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No data yet</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={lessonsChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
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
                  {schoolsChart.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No data yet</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={schoolsChart} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} width={80} />
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
                { key: "city", label: "City", render: v => v || "—" },
                { key: "website", label: "Website", render: v => v ? <a href={v} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">{v}</a> : "—" },
                { key: "createdAt", label: "Date Added", render: v => fmtDate(v) },
                { key: "id", label: "Actions", render: (v, row) => (
                  <div className="flex gap-2">
                    <Dialog open={schoolDialog.open && schoolDialog.existing?.id === v} onOpenChange={o => setSchoolDialog(o ? { open: true, existing: row } : { open: false })}>
                      <DialogTrigger asChild>
                        <button className="text-slate-400 hover:text-white p-1" data-testid={`button-edit-school-${v}`}><Pencil className="w-4 h-4" /></button>
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
                { key: "username", label: "Username", render: v => <span className="text-slate-400 text-xs font-mono">{v}</span> },
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
                { key: "sponsorName", label: "Sponsor", render: v => v || "—" },
                { key: "createdAt", label: "Created", render: v => fmtDate(v) },
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
                { key: "contactName", label: "Contact", render: v => v || "—" },
                { key: "contactEmail", label: "Email", render: v => v || "—" },
                { key: "country", label: "Country" },
                { key: "website", label: "Website", render: v => v ? <a href={v} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">{v}</a> : "—" },
                { key: "createdAt", label: "Added", render: v => fmtDate(v) },
                { key: "id", label: "Actions", render: (v, row) => (
                  <div className="flex gap-2">
                    <Dialog open={sponsorDialog.open && sponsorDialog.existing?.id === v} onOpenChange={o => setSponsorDialog(o ? { open: true, existing: row } : { open: false })}>
                      <DialogTrigger asChild>
                        <button className="text-slate-400 hover:text-white p-1" data-testid={`button-edit-sponsor-${v}`}><Pencil className="w-4 h-4" /></button>
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
                { key: "description", label: "Description", render: v => <span className="text-slate-400 text-xs">{String(v).slice(0, 60)}{String(v).length > 60 ? "..." : ""}</span> },
                { key: "startDate", label: "Start", render: v => fmtDate(v) },
                { key: "endDate", label: "End", render: v => fmtDate(v) },
                { key: "targetValue", label: "Target", render: v => v ? `$${v}` : "—" },
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
                      <p className="text-slate-400 text-sm mb-4">{r.desc}</p>
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
                  <div><p className="text-slate-400">Total Students</p><p className="text-white font-bold text-xl">{students.length}</p></div>
                  <div><p className="text-slate-400">Total Teachers</p><p className="text-white font-bold text-xl">{teachers.length}</p></div>
                  <div><p className="text-slate-400">Avg Quiz Score</p><p className="text-emerald-400 font-bold text-xl">{students.length > 0 ? Math.round(students.reduce((s: number, st: any) => s + st.quizScore, 0) / students.length) : 0}%</p></div>
                  <div><p className="text-slate-400">Avg Lessons Done</p><p className="text-violet-400 font-bold text-xl">{students.length > 0 ? (students.reduce((s: number, st: any) => s + st.lessonsCompleted, 0) / students.length).toFixed(1) : 0}/6</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
            <p className="text-slate-400 text-sm">Viewing table: <span className="text-indigo-400 font-mono">{dbTable}</span> — {dbRows.length} rows (max 500)</p>
            {dbRows.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 text-center text-slate-500">No records in this table</div>
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
                          <td key={j} className="px-3 py-2 text-slate-400 whitespace-nowrap font-mono max-w-[200px] truncate">
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

      </main>
    </div>
  );
}
