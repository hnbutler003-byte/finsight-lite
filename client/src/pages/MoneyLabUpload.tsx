import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Upload, FileText, Image, Loader2, CheckCircle2, XCircle, Trash2,
  ArrowLeft, BookOpen, ChevronDown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const SUBJECTS = [
  "Accounting", "Commerce", "Economics", "Business Studies",
  "Mathematics", "General Knowledge", "Social Studies", "Other"
];

export default function MoneyLabUpload() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Commerce");
  const [dragActive, setDragActive] = useState(false);

  const { data: papers, isLoading } = useQuery<any[]>({
    queryKey: ["/api/moneylab/papers"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name.replace(/\.[^/.]+$/, ""));
      formData.append("subject", subject);

      const res = await fetch("/api/moneylab/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moneylab/papers"] });
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/moneylab/papers"] }), 5000);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/moneylab/papers"] }), 15000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/moneylab/papers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moneylab/papers"] });
    },
  });

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext || "")) {
      alert("Only PDF, JPG, and PNG files are supported.");
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/moneylab">
              <Button variant="outline" size="icon" className="rounded-2xl border-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold" data-testid="text-upload-title">Upload Past Paper</h1>
              <p className="text-sm text-muted-foreground">Upload exam papers to generate quiz games</p>
            </div>
          </div>

          <Card className="glass-card rounded-glass">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-1 block">Paper Title (optional)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. BGCSE Commerce 2024"
                    className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-card px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"
                    data-testid="input-paper-title"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-1 block">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-card px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 appearance-none"
                    data-testid="select-subject"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 scale-[1.02]"
                    : "border-gray-300 dark:border-gray-700 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/10"
                }`}
                data-testid="dropzone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                  data-testid="input-file"
                />
                {uploadMutation.isPending ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
                    <p className="font-bold text-teal-600">Uploading & extracting questions...</p>
                    <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <p className="font-bold text-lg">Drop your exam paper here</p>
                    <p className="text-sm text-muted-foreground">or click to browse · PDF, JPG, PNG (max 10MB)</p>
                    <div className="flex gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold dark:bg-red-950/30">
                        <FileText className="w-3 h-3" /> PDF
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold dark:bg-blue-950/30">
                        <Image className="w-3 h-3" /> JPG
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold dark:bg-green-950/30">
                        <Image className="w-3 h-3" /> PNG
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-500" />
              Your Uploaded Papers
            </h2>

            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : !papers?.length ? (
              <Card className="glass-card rounded-glass">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="font-medium">No papers uploaded yet</p>
                  <p className="text-sm mt-1">Upload your first exam paper to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {papers.map((paper: any) => (
                  <Card key={paper.id} className="rounded-2xl border-2 hover:border-teal-200 dark:hover:border-teal-800 transition-all" data-testid={`paper-${paper.id}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        paper.status === "completed" ? "bg-green-100 dark:bg-green-900/30" :
                        paper.status === "failed" ? "bg-red-100 dark:bg-red-900/30" :
                        "bg-amber-100 dark:bg-amber-900/30"
                      }`}>
                        {paper.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                         paper.status === "failed" ? <XCircle className="w-5 h-5 text-red-500" /> :
                         <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{paper.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {paper.subject} · {paper.questionCount || 0} questions · {paper.fileType?.toUpperCase()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(paper.id)}
                        className="text-red-400 hover:text-red-600 shrink-0"
                        data-testid={`button-delete-paper-${paper.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
