import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link2, Upload, Library, X, PlayCircle, Loader2, Video, Check } from "lucide-react";

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embed = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embed) return embed[1];
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

type OrgVideo = { url: string; name: string; updatedAt?: string | null };

function VideoLibrarySheet({
  onSelect,
  onClose,
  darkMode,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
  darkMode?: boolean;
}) {
  const { data: videos, isLoading } = useQuery<OrgVideo[]>({
    queryKey: ["/api/org-admin/videos"],
    queryFn: () => fetch("/api/org-admin/videos", { credentials: "include" }).then(r => r.json()),
  });

  const bg = darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-background border-input";
  const cardBg = darkMode ? "bg-slate-700 border-slate-600" : "bg-muted/50 border-input";
  const mutedText = darkMode ? "text-slate-300" : "text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border-2 shadow-2xl ${bg} p-6 space-y-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-base">Video Library</span>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg hover:bg-black/10 ${mutedText}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : !videos?.length ? (
          <div className={`text-center py-8 space-y-2 ${mutedText}`}>
            <Video className="w-10 h-10 mx-auto opacity-40" />
            <p className="text-sm">No videos uploaded yet.</p>
            <p className="text-xs">Use the upload button to add videos to your library.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {videos.map(v => (
              <button
                key={v.url}
                onClick={() => { onSelect(v.url); onClose(); }}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 ${cardBg} hover:border-blue-400 transition-all group`}
                data-testid={`button-library-video-${v.url}`}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <PlayCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  {v.updatedAt && (
                    <p className={`text-xs ${mutedText}`}>{new Date(v.updatedAt).toLocaleDateString()}</p>
                  )}
                </div>
                <Check className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type VideoFieldProps = {
  value: string;
  onChange: (url: string) => void;
  darkMode?: boolean;
  label?: string;
};

export function VideoField({ value, onChange, darkMode, label = "Lesson Video" }: VideoFieldProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const inputClass = darkMode
    ? "w-full rounded border border-slate-600 bg-slate-700 text-white px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    : "w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400";

  const labelClass = darkMode
    ? "text-slate-300 text-xs mb-1 block"
    : "text-xs font-bold";

  const mutedText = darkMode ? "text-slate-400" : "text-muted-foreground";

  const embedUrl = value ? getYouTubeEmbedUrl(value) : null;
  const thumbnail = value ? getYouTubeThumbnail(value) : null;
  const isDirectVideo = value && !embedUrl && /\.(mp4|webm|ogv|mov)(\?|$)/i.test(value);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      const res = await fetch("/api/org-admin/videos/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }
      const data = await res.json();
      onChange(data.url);
      toast({ title: "Video uploaded", description: data.name });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className={labelClass}>{label} <span className={`${mutedText} font-normal`}>(optional)</span></label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText} pointer-events-none`} />
          <input
            type="url"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="YouTube URL or paste video link…"
            className={`${inputClass} pl-9`}
            data-testid="input-lesson-video-url"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/10 ${mutedText}`}
              data-testid="button-clear-video-url"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
            darkMode
              ? "border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-indigo-300"
              : "border-input text-muted-foreground hover:border-blue-400 hover:text-blue-600"
          }`}
          title="Upload video from device"
          data-testid="button-upload-video"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="hidden sm:inline">{uploading ? "Uploading…" : "Upload"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
            darkMode
              ? "border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-indigo-300"
              : "border-input text-muted-foreground hover:border-blue-400 hover:text-blue-600"
          }`}
          title="Choose from library"
          data-testid="button-open-video-library"
        >
          <Library className="w-4 h-4" />
          <span className="hidden sm:inline">Library</span>
        </button>
      </div>

      {thumbnail && !isDirectVideo && (
        <div className="relative rounded-xl overflow-hidden border-2 border-input group">
          <img
            src={thumbnail}
            alt="YouTube thumbnail"
            className="w-full h-36 object-cover"
            data-testid="img-youtube-thumbnail"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-all">
            <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
          <div className={`absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${darkMode ? "bg-slate-800/80 text-slate-200" : "bg-background/80 text-foreground"}`}>
            YouTube
          </div>
        </div>
      )}

      {isDirectVideo && (
        <div className="rounded-xl overflow-hidden border-2 border-input">
          <video
            src={value}
            controls
            className="w-full max-h-40"
            data-testid="video-preview"
          />
        </div>
      )}

      {value && !thumbnail && !isDirectVideo && (
        <p className={`text-xs ${mutedText} flex items-center gap-1`}>
          <Link2 className="w-3 h-3" />
          External video URL saved. Preview not available for this URL type.
        </p>
      )}

      {showLibrary && (
        <VideoLibrarySheet
          onSelect={onChange}
          onClose={() => setShowLibrary(false)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
