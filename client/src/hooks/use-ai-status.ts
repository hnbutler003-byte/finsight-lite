import { useQuery } from "@tanstack/react-query";

interface AiStatusResponse {
  enabled: boolean;
}

/**
 * Returns whether AI features are currently enabled on the server.
 * Defaults to disabled (false) while loading so AI features never flash
 * before the status is known.
 */
export function useAiStatus(): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery<AiStatusResponse>({
    queryKey: ["/api/ai/status"],
  });
  return { enabled: data?.enabled ?? false, isLoading };
}
