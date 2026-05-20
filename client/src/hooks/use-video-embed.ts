import { useQuery } from "@tanstack/react-query";

export type VideoEmbedData = {
  embedUrl: string;
  thumbnailUrl: string;
  title: string;
};

export function useVideoEmbed(url: string | null | undefined) {
  const isYouTube = !!url && (url.includes("youtube.com") || url.includes("youtu.be"));

  const { data, isLoading, isError } = useQuery<VideoEmbedData>({
    queryKey: ["/api/video/oembed", url],
    queryFn: async () => {
      const r = await fetch(`/api/video/oembed?url=${encodeURIComponent(url!)}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("not embeddable");
      return r.json();
    },
    enabled: isYouTube,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });

  return {
    embedUrl: data?.embedUrl ?? null,
    thumbnailUrl: data?.thumbnailUrl ?? null,
    title: data?.title ?? null,
    isLoading: isYouTube && isLoading,
    isError: isYouTube && isError,
    isYouTube,
  };
}
