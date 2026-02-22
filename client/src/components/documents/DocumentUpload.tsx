import { useState, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, FileUp, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { DocumentUpload as DocUploadType } from "@shared/schema";

const CURRENCIES = [
  { code: "BBD", name: "Barbadian Dollar" },
  { code: "BSD", name: "Bahamian Dollar" },
  { code: "GYD", name: "Guyanese Dollar" },
  { code: "HTG", name: "Haitian Gourde" },
  { code: "JMD", name: "Jamaican Dollar" },
  { code: "TTD", name: "Trinidad & Tobago Dollar" },
  { code: "USD", name: "US Dollar" },
  { code: "XCD", name: "East Caribbean Dollar" },
];

export function DocumentUploadSection() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadCurrency, setUploadCurrency] = useState("BSD");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: uploads = [], isLoading: uploadsLoading } = useQuery<DocUploadType[]>({
    queryKey: ["/api/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("currency", uploadCurrency);
      
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errData.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/converted"] });
      
      if (data.error) {
        toast({
          title: "Could not parse file",
          description: data.error,
          variant: "destructive",
        });
      } else {
        const dupeMsg = data.duplicatesSkipped > 0 ? ` (${data.duplicatesSkipped} duplicates skipped)` : "";
        toast({
          title: "Statement processed",
          description: `${data.transactionsCreated} transactions imported successfully.${dupeMsg}`,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(errData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/converted"] });
      toast({ title: "Upload removed", description: "The upload and its imported transactions have been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFile = useCallback((file: File) => {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'pdf', 'xlsx', 'xls'].includes(ext || '')) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a CSV, PDF, or Excel file.",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate(file);
  }, [uploadMutation, toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [handleFile]);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FileUp className="w-5 h-5 text-primary" />
          <h3 className="font-display text-xl font-bold" data-testid="text-upload-title">Upload Bank Statement</h3>
        </div>
        <Select value={uploadCurrency} onValueChange={setUploadCurrency}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/50 border-none" data-testid="select-upload-currency">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code} data-testid={`option-currency-${c.code}`}>
                {c.code} - {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/20 hover:border-primary/40"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="dropzone-upload"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
          data-testid="input-file-upload"
        />
        
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Processing your bank statement...</p>
            <p className="text-xs text-muted-foreground">This may take a moment while we read and categorize your transactions.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">Drag and drop your bank statement here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse. Supports CSV, PDF, and Excel files (max 5MB)</p>
            </div>
            <Button variant="outline" size="sm" className="mt-2" data-testid="button-browse-files">
              Browse Files
            </Button>
          </div>
        )}
      </div>

      {uploadsLoading && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Upload History</h4>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-muted rounded" />
                  <div>
                    <div className="h-4 w-32 bg-muted rounded mb-1" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-5 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!uploadsLoading && uploads.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Upload History</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {uploads.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-3"
                data-testid={`upload-item-${doc.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-filename-${doc.id}`}>{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy h:mm a") : "Unknown date"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.status === "completed" && (
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${doc.id}`}>
                      <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                      {doc.transactionsCreated} imported
                    </Badge>
                  )}
                  {doc.status === "processing" && (
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${doc.id}`}>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Processing
                    </Badge>
                  )}
                  {doc.status === "failed" && (
                    <Badge variant="destructive" className="text-xs" data-testid={`badge-status-${doc.id}`}>
                      <XCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-upload-${doc.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
