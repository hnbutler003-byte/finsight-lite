import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";

export function useStats(filters?: { startDate?: string; endDate?: string; period?: 'monthly' | 'yearly' | 'all' }) {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: [api.stats.get.path, filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters?.startDate) searchParams.append("startDate", filters.startDate);
      if (filters?.endDate) searchParams.append("endDate", filters.endDate);
      if (filters?.period && filters.period !== 'all') searchParams.append("period", filters.period);
      
      const res = await fetch(`${api.stats.get.path}?${searchParams.toString()}`, { credentials: "include" });
      
      if (res.status === 401) {
        redirectToLogin(toast);
        return null;
      }
      
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      return api.stats.get.responses[200].parse(data);
    },
  });
}
