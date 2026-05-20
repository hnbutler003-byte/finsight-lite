import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link2, Upload, Library, X, PlayCircle, Loader2, Video, Check, AlertTriangle } from "lucide-react";
import { useVideoEmbed } from "@/hooks/use-video-embed";

function extractYouTubeThumbUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("?")[0];
      return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://img.youtube.com/vi/${v}/mqdefault.jpg`;
      const m = u.pathname.match(/\/(?:shorts|live|embed)\/([^/?]+)/);
      if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
    }
  } catch {}
  return null;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogv|mov|avi)(\?|$)/i.test(url);
}

type OrgVideo = { url: string; name: string; updatedAt?: string | null };

function VideoThumbnailCard({
  video,
  onSelect,
  onClose,
  darkMode,
}: {
  video: OrgVideo;
  onSelect: (url: string) => void;
  onClose: () => void;
  darkMode?: boolean;
}) {
  const ytThumb = extractYouTubeThumbUrl(video.url);
  const isDirect = isDirectVideoUrl(video.url);
  const cardBg = darkMode
    ? "bg-slate-700 border-slate-600 hover:border-indigo-400"
    : "bg-muted/60 border-input hover:border-blue-400";

  return (
    <button
      onClick={() => { onSelect(video.url); onClose(); }}
      className={`w-full text-left rounded-xl border-2 ${cardBg} overflow-hidden transition-all group`}
      data-testid={`button-library-video-${video.url}`}
    >
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        {ytThumb ? (
          <img src={ytThumb} alt={video.name} className="w-full h-full object-cover" />
        ) : isDirect ? (
          <video src={video.url} preload="metadata" className="w-full h-full object-cover" muted />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-slate-800">
            <Video className="w-8 h-8 text-slate-400" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-all">
          <PlayCircle className="w-8 h-8 text-white drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>
        {ytThumb && (
          <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-red-600 text-white px-1 py-0.5 rounded leading-none">
            YT
          </span>
        )}
        <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Check className="w-4 h-4 text-white drop-shadow" />
        </span>
      </div>
      <div className="px-2 py-1.5">
        <p className={`text-xs font-medium truncate ${darkMode ? "text-slate-200" : "text-foreground"}`}>
          {video.name}
        </p>
        {video.updatedAt && (
          <p className={`text-[10px] ${darkMode ? "text-slate-400" : "text-muted-foreground"}`}>
            {new Date(video.updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </button>
  );
}

function VideoLibrarySheet({
  listEndpoint,
  onSelect,
  onClose,
  darkMode,
}: {
  listEndpoint: string;
  onSelect: (url: string) => void;
  onClose: () => void;
  darkMode?: boolean;
}) {
  const { data: videos, isLoading, isError } = useQuery<OrgVideo[]>({
    queryKey: [listEndpoint],
    queryFn: async () => {
      const r = await fetch(listEndpoint, { credentials: "include" });
      if (!r.ok) throw new Error(`Failed to load video library (${r.status})`);
      return r.json();
    },
    retry: 1,
  });

  const bg = darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-background border-input";
  const mutedText = darkMode ? "text-slate-400" : "text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-lg rounded-2xl border-2 shadow-2xl ${bg} p-6 space-y-4`}
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
        ) : isError ? (
          <div className={`text-center py-8 space-y-2 ${mutedText}`}>
            <Video className="w-10 h-10 mx-auto opacity-40" />
            <p className="text-sm font-medium">Could not load video library.</p>
            <p className="text-xs">Check your connection or session and try again.</p>
          </div>
        ) : !videos?.length ? (
          <div className={`text-center py-8 space-y-2 ${mutedText}`}>
            <Video className="w-10 h-10 mx-auto opacity-40" />
            <p className="text-sm">No videos uploaded yet.</p>
            <p className="text-xs">Use the upload button to add videos to your library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {videos.map(v => (
              <VideoThumbnailCard
                key={v.url}
                video={v}
                onSelect={onSelect}
                onClose={onClose}
                darkMode={darkMode}
              />
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
  uploadEndpoint?: string;
  listEndpoint?: string;
};

export function VideoField({
  value,
  onChange,
  darkMode,
  label = "Lesson Video",
  uploadEndpoint = "/api/org-admin/videos/upload",
  listEndpoint = "/api/org-admin/videos",
}: VideoFieldProps) {
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
  const btnClass = darkMode
    ? "border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-indigo-300"
    : "border-input text-muted-foreground hover:border-blue-400 hover:text-blue-600";

  const { thumbnailUrl, isLoading: embedLoading, isError: embedError, isYouTube } = useVideoEmbed(value || null);
  const isDirect = value ? isDirectVideoUrl(value) : false;

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      const res = await fetch(uploadEndpoint, {
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
      <label className={labelClass}>
        {label} <span className={`${mutedText} font-normal`}>(optional)</span>
      </label>

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
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${btnClass}`}
          title="Upload video from device"
          data-testid="button-upload-video"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="hidden sm:inline">{uploading ? "Uploading…" : "Upload"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${btnClass}`}
          title="Choose from library"
          data-testid="button-open-video-library"
        >
          <Library className="w-4 h-4" />
          <span className="hidden sm:inline">Library</span>
        </button>
      </div>

      {isYouTube && embedLoading && (
        <div className={`flex items-center gap-2 text-xs ${mutedText}`}>
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking video…
        </div>
      )}

      {thumbnailUrl && (
        <div className="relative rounded-xl overflow-hidden border-2 border-input group">
          <img
            src={thumbnailUrl}
            alt="YouTube thumbnail"
            className="w-full h-36 object-cover"
            data-testid="img-youtube-thumbnail"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-all">
            <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
          <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded leading-none">
            YouTube
          </span>
        </div>
      )}

      {isYouTube && embedError && !embedLoading && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5" data-testid="warning-video-unresolvable">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          This YouTube URL could not be verified. Students may not see an embedded player.
        </p>
      )}

      {isDirect && (
        <div className="rounded-xl overflow-hidden border-2 border-input">
          <video
            src={value}
            controls
            className="w-full max-h-40"
            data-testid="video-preview"
          />
        </div>
      )}

      {value && !isYouTube && !isDirect && (
        <p className={`text-xs ${mutedText} flex items-center gap-1`}>
          <Link2 className="w-3 h-3" />
          External video URL saved. Preview not available for this URL type.
        </p>
      )}

      {showLibrary && (
        <VideoLibrarySheet
          listEndpoint={listEndpoint}
          onSelect={onChange}
          onClose={() => setShowLibrary(false)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
