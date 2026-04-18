import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, Loader2, Trash2, Zap, AlertCircle, Upload, Download, FileUp, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";

type ImportRow = {
  rowNum: number;
  firstName: string;
  lastName: string | null;
  username: string;
  avatar: string;
  email: string | null;
  classCode: string | null;
  classRef: { type: "class"; id: number; name: string } | { type: "org"; envId: string; name: string } | null;
  status: "ok" | "error";
  issues: string[];
};

type PreviewResponse = { rows: ImportRow[]; summary: { total: number; ok: number; errors: number } };
type CommitResponse = {
  summary: { total: number; created: number; skipped: number; emailed: number };
  created: { rowNum: number; userId: string; username: string; firstName: string; emailSent: boolean; enrolled: boolean }[];
  skipped: { rowNum: number; reason: string }[];
};

const SAMPLE_CSV = `firstName,lastName,avatar,email,classCode
Alex,Bain,lion,alex@school.bs,
Jordan,Knowles,dolphin,,ABC123
Sky,Rolle,,,
`;

type EnrichedStudent = {
  id: string;
  org_id: string;
  env_id: string;
  student_user_id: string;
  joined_at: string;
  displayName: string;
  username: string | null;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
  envName: string;
};

const AVATAR_MAP: Record<string, string> = {
  lion: "🦁", dolphin: "🐬", parrot: "🦜", turtle: "🐢",
  star: "⭐", butterfly: "🦋", octopus: "🐙", artist: "🎨",
  rocket: "🚀", wave: "🌊", palm: "🌴", gamer: "🎮",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrgStudents() {
  const { admin, isLoading: authLoading } = useOrgAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: students, isLoading } = useQuery<EnrichedStudent[]>({
    queryKey: ["/api/org-admin/students"],
    queryFn: () => fetch("/api/org-admin/students", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const removeMutation = useMutation({
    mutationFn: (studentUserId: string) =>
      fetch(`/api/org-admin/students/${studentUserId}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/org-admin/students"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
      toast({ title: "Student removed", description: "The student has been unenrolled from your organization." });
      setConfirmDelete(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not remove student. Please try again.", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!admin) {
    setLocation("/org/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <OrgSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-3xl">Students</h1>
              <p className="text-muted-foreground mt-1">Enrolled in {admin.orgName}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setImportFile(null);
                  setPreview(null);
                  setCommitResult(null);
                  setImportOpen(true);
                }}
                className="rounded-2xl border-2 gap-2"
                data-testid="button-open-import"
              >
                <Upload className="w-4 h-4" /> Import CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("/api/org-admin/students.csv", "_blank")}
                className="rounded-2xl border-2 gap-2"
                disabled={!students?.length}
                data-testid="button-export-students-csv"
              >
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-4 py-2 border border-blue-100 dark:border-blue-800">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-display font-bold text-lg text-blue-600" data-testid="text-student-count">{students?.length ?? 0}</span>
                <span className="text-sm text-muted-foreground font-medium">enrolled</span>
              </div>
            </div>
          </div>

          <ImportStudentsDialog
            open={importOpen}
            onOpenChange={(open) => {
              setImportOpen(open);
              if (!open) {
                setImportFile(null);
                setPreview(null);
                setCommitResult(null);
              }
            }}
            file={importFile}
            setFile={setImportFile}
            preview={preview}
            setPreview={setPreview}
            commitResult={commitResult}
            setCommitResult={setCommitResult}
            fileInputRef={fileInputRef}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["/api/org-admin/students"] });
              qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
            }}
          />

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : !students?.length ? (
            <Card className="glass-card rounded-glass border-dashed">
              <CardContent className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">No students yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Share your organization join code so students can enroll.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {students.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                  data-testid={`row-student-${s.student_user_id}`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-xl">
                    {s.avatar ? (AVATAR_MAP[s.avatar] ?? "🧑‍🎓") : "🧑‍🎓"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{s.displayName}</p>
                      {s.username && <span className="text-xs text-muted-foreground">@{s.username}</span>}
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg font-bold">Lv {s.level}</span>
                      {s.streak > 0 && <span className="text-xs text-amber-600 font-bold">🔥 {s.streak}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-500" />{s.xp} XP</span>
                      <span>Joined {formatDate(s.joined_at)}</span>
                      {s.envName && <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg font-medium">{s.envName}</span>}
                    </div>
                  </div>

                  {confirmDelete === s.student_user_id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Confirm remove?
                      </p>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeMutation.mutate(s.student_user_id)}
                        disabled={removeMutation.isPending}
                        className="rounded-xl text-xs"
                        data-testid={`button-confirm-remove-${s.student_user_id}`}
                      >
                        {removeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-xl text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(s.student_user_id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      data-testid={`button-remove-student-${s.student_user_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ImportStudentsDialog({
  open, onOpenChange, file, setFile, preview, setPreview, commitResult, setCommitResult, fileInputRef, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  preview: PreviewResponse | null;
  setPreview: (p: PreviewResponse | null) => void;
  commitResult: CommitResponse | null;
  setCommitResult: (c: CommitResponse | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/org-admin/students/import/preview", { method: "POST", credentials: "include", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? "Preview failed");
      return data as PreviewResponse;
    },
    onSuccess: (data) => setPreview(data),
    onError: (e: any) => toast({ title: "Couldn't read CSV", description: e.message, variant: "destructive" }),
  });

  const commitMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/org-admin/students/import", { method: "POST", credentials: "include", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? "Import failed");
      return data as CommitResponse;
    },
    onSuccess: (data) => {
      setCommitResult(data);
      onSuccess();
      toast({
        title: `Imported ${data.summary.created} student${data.summary.created === 1 ? "" : "s"}`,
        description: data.summary.emailed > 0 ? `${data.summary.emailed} welcome email${data.summary.emailed === 1 ? "" : "s"} sent.` : undefined,
      });
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setCommitResult(null);
    if (f) previewMutation.mutate(f);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-import-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import students from CSV</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet to create accounts in bulk. Each student will be enrolled in your current environment;
            you can also drop them straight into a class with a class code.
          </DialogDescription>
        </DialogHeader>

        {!commitResult && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/10 p-5 text-sm space-y-2">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold">Required column: <code className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">firstName</code></p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Optional: <code className="bg-white dark:bg-zinc-800 px-1 rounded text-[11px]">lastName</code>,{" "}
                    <code className="bg-white dark:bg-zinc-800 px-1 rounded text-[11px]">avatar</code>,{" "}
                    <code className="bg-white dark:bg-zinc-800 px-1 rounded text-[11px]">email</code>,{" "}
                    <code className="bg-white dark:bg-zinc-800 px-1 rounded text-[11px]">classCode</code>,{" "}
                    <code className="bg-white dark:bg-zinc-800 px-1 rounded text-[11px]">username</code>.
                    Usernames are auto-generated when blank.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadSample} className="rounded-xl shrink-0" data-testid="button-download-sample">
                  <Download className="w-3.5 h-3.5 mr-1" /> Sample
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
                data-testid="input-import-file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="rounded-2xl border-2 gap-2"
                data-testid="button-choose-file"
              >
                <FileUp className="w-4 h-4" /> {file ? "Choose a different file" : "Choose CSV file"}
              </Button>
              {file && <span className="text-sm text-muted-foreground truncate" data-testid="text-import-filename">{file.name}</span>}
            </div>

            {previewMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Reading and validating rows…
              </div>
            )}

            {preview && (
              <div className="space-y-3" data-testid="import-preview">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border-2 p-3 text-center">
                    <p className="font-display font-bold text-2xl">{preview.summary.total}</p>
                    <p className="text-xs text-muted-foreground">Total rows</p>
                  </div>
                  <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 p-3 text-center">
                    <p className="font-display font-bold text-2xl text-emerald-600">{preview.summary.ok}</p>
                    <p className="text-xs text-muted-foreground">Ready to import</p>
                  </div>
                  <div className="rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10 p-3 text-center">
                    <p className="font-display font-bold text-2xl text-red-600">{preview.summary.errors}</p>
                    <p className="text-xs text-muted-foreground">Need fixing</p>
                  </div>
                </div>

                <div className="rounded-2xl border-2 max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
                      <tr>
                        <th className="text-left p-2 w-10">#</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Username</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Class</th>
                        <th className="text-left p-2 w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((r) => (
                        <tr key={r.rowNum} className="border-t" data-testid={`row-import-${r.rowNum}`}>
                          <td className="p-2 text-muted-foreground">{r.rowNum}</td>
                          <td className="p-2 font-medium">{r.firstName}{r.lastName ? ` ${r.lastName}` : ""}</td>
                          <td className="p-2 text-xs font-mono">{r.username || "—"}</td>
                          <td className="p-2 text-xs">{r.email ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-2 text-xs">{r.classRef?.name ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-2">
                            {r.status === "ok" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> OK
                              </span>
                            ) : (
                              <span title={r.issues.join("; ")} className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                                <XCircle className="w-3.5 h-3.5" /> Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview.summary.errors > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Hover the “Error” badge to see what to fix. Only OK rows will be imported.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {commitResult && (
          <div className="space-y-3" data-testid="import-result">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 p-4 text-center">
                <p className="font-display font-bold text-2xl text-emerald-600">{commitResult.summary.created}</p>
                <p className="text-xs text-muted-foreground">Students created</p>
              </div>
              <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10 p-4 text-center">
                <p className="font-display font-bold text-2xl text-blue-600">{commitResult.summary.emailed}</p>
                <p className="text-xs text-muted-foreground">Welcome emails sent</p>
              </div>
              <div className="rounded-2xl border-2 p-4 text-center">
                <p className="font-display font-bold text-2xl">{commitResult.summary.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>

            {commitResult.created.length > 0 && (
              <div className="rounded-2xl border-2 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Username</th>
                      <th className="text-left p-2 w-24">Enrolled</th>
                      <th className="text-left p-2 w-24">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commitResult.created.map((c) => (
                      <tr key={c.userId} className="border-t" data-testid={`row-imported-${c.userId}`}>
                        <td className="p-2">{c.firstName}</td>
                        <td className="p-2 font-mono text-xs">{c.username}</td>
                        <td className="p-2 text-xs">{c.enrolled ? "Yes" : <span className="text-amber-600">Failed</span>}</td>
                        <td className="p-2 text-xs">{c.emailSent ? "Sent" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {commitResult.skipped.length > 0 && (
              <details className="rounded-2xl border-2 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {commitResult.skipped.length} skipped row{commitResult.skipped.length === 1 ? "" : "s"}
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {commitResult.skipped.map((s) => (
                    <li key={s.rowNum}>Row {s.rowNum}: {s.reason}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl" data-testid="button-close-import">
            {commitResult ? "Done" : "Cancel"}
          </Button>
          {!commitResult && (
            <Button
              onClick={() => file && commitMutation.mutate(file)}
              disabled={!file || !preview || preview.summary.ok === 0 || commitMutation.isPending}
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 gap-2"
              data-testid="button-confirm-import"
            >
              {commitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {preview ? preview.summary.ok : ""} student{preview?.summary.ok === 1 ? "" : "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
