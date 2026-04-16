import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Image as ImageIcon, Upload, Trash2, Award } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Branding = {
  logoUrl: string | null;
  signatureLeftName: string | null;
  signatureLeftRole: string | null;
  signatureRightName: string | null;
  signatureRightRole: string | null;
};

const DEFAULT_LEFT_NAME = "Lakeisha Deveaux";
const DEFAULT_LEFT_ROLE = "GENERAL INSTRUCTOR";
const DEFAULT_RIGHT_NAME = "Annie Brown";
const DEFAULT_RIGHT_ROLE = "ASSISTANT INSTRUCTOR";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB pre-encoding

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function OrgBranding() {
  const { admin, isLoading: authLoading } = useOrgAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [leftName, setLeftName] = useState("");
  const [leftRole, setLeftRole] = useState("");
  const [rightName, setRightName] = useState("");
  const [rightRole, setRightRole] = useState("");
  const [dirty, setDirty] = useState(false);

  const { data: branding, isLoading } = useQuery<Branding>({
    queryKey: ["/api/org-admin/branding"],
    queryFn: () => apiRequest("GET", "/api/org-admin/branding").then(r => r.json()),
    enabled: !!admin,
  });

  useEffect(() => {
    if (!branding) return;
    setLogoUrl(branding.logoUrl);
    setLeftName(branding.signatureLeftName ?? "");
    setLeftRole(branding.signatureLeftRole ?? "");
    setRightName(branding.signatureRightName ?? "");
    setRightRole(branding.signatureRightRole ?? "");
    setDirty(false);
  }, [branding]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        logoUrl: logoUrl,
        signatureLeftName: leftName.trim() || null,
        signatureLeftRole: leftRole.trim() || null,
        signatureRightName: rightName.trim() || null,
        signatureRightRole: rightRole.trim() || null,
      };
      const r = await apiRequest("PATCH", "/api/org-admin/branding", body);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/branding"] });
      toast({ title: "Certificate branding saved" });
      setDirty(false);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
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

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file (PNG, JPG, WebP).", variant: "destructive" });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({ title: "Image too large", description: "Logo must be 2 MB or smaller.", variant: "destructive" });
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setLogoUrl(dataUrl);
      setDirty(true);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearLogo = () => {
    setLogoUrl(null);
    setDirty(true);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <OrgSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl">Certificate Branding</h1>
              <p className="text-sm text-muted-foreground">Upload your logo and set instructor signatures shown on student certificates.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : (
            <>
              <Card className="glass-card rounded-glass">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                    <h3 className="font-display font-bold text-lg">Logo</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Shown at the top of every certificate. PNG with transparent background works best. Max 2 MB.
                  </p>

                  <div className="flex items-start gap-6 flex-wrap">
                    <div
                      className="w-40 h-40 rounded-2xl border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden"
                      data-testid="branding-logo-preview"
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs">No logo set</p>
                          <p className="text-[10px] mt-1">(default will be used)</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={onPickFile}
                        data-testid="input-logo-file"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-2xl"
                        data-testid="button-upload-logo"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {logoUrl ? "Replace logo" : "Upload logo"}
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearLogo}
                          className="rounded-2xl"
                          data-testid="button-remove-logo"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove (use default)
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card rounded-glass">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-display font-bold text-lg">Signatures</h3>
                  <p className="text-sm text-muted-foreground">
                    Two signature blocks appear at the bottom of each certificate. Leave blank to use defaults
                    ("{DEFAULT_LEFT_NAME}" / "{DEFAULT_RIGHT_NAME}").
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 p-4 rounded-2xl border border-input">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Left signature</p>
                      <div>
                        <Label className="text-xs mb-1 block">Name</Label>
                        <Input
                          value={leftName}
                          onChange={e => { setLeftName(e.target.value); setDirty(true); }}
                          placeholder={DEFAULT_LEFT_NAME}
                          maxLength={80}
                          data-testid="input-signature-left-name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Role / Title</Label>
                        <Input
                          value={leftRole}
                          onChange={e => { setLeftRole(e.target.value); setDirty(true); }}
                          placeholder={DEFAULT_LEFT_ROLE}
                          maxLength={80}
                          data-testid="input-signature-left-role"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-2xl border border-input">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Right signature</p>
                      <div>
                        <Label className="text-xs mb-1 block">Name</Label>
                        <Input
                          value={rightName}
                          onChange={e => { setRightName(e.target.value); setDirty(true); }}
                          placeholder={DEFAULT_RIGHT_NAME}
                          maxLength={80}
                          data-testid="input-signature-right-name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Role / Title</Label>
                        <Input
                          value={rightRole}
                          onChange={e => { setRightRole(e.target.value); setDirty(true); }}
                          placeholder={DEFAULT_RIGHT_ROLE}
                          maxLength={80}
                          data-testid="input-signature-right-role"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-3">
                <p className="text-sm text-muted-foreground" data-testid="text-dirty-status">
                  {dirty ? "Unsaved changes" : "All changes saved"}
                </p>
                <Button
                  onClick={() => save.mutate()}
                  disabled={!dirty || save.isPending}
                  className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
                  data-testid="button-save-branding"
                >
                  {save.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>) : "Save changes"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
