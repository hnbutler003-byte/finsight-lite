import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import type { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

type CreateTransactionRequest = z.infer<typeof insertTransactionSchema>;

export function useTransactions(filters?: { startDate?: string; endDate?: string; categoryId?: string; limit?: number }) {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: [api.transactions.list.path, filters],
    queryFn: async () => {
      const url = buildUrl(api.transactions.list.path);
      // Construct query string manually since buildUrl only handles path params
      const searchParams = new URLSearchParams();
      if (filters?.startDate) searchParams.append("startDate", filters.startDate);
      if (filters?.endDate) searchParams.append("endDate", filters.endDate);
      if (filters?.categoryId) searchParams.append("categoryId", filters.categoryId);
      // Default to the server's hard cap so existing pages keep showing the same data.
      // Override with explicit `limit` for smaller widgets (e.g. dashboard recents).
      searchParams.append("limit", String(filters?.limit ?? 200));

      const res = await fetch(`${url}?${searchParams.toString()}`, { credentials: "include" });
      
      if (res.status === 401) {
        redirectToLogin(toast);
        return [];
      }
      
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTransactionRequest) => {
      const res = await fetch(api.transactions.create.path, {
        method: api.transactions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (res.status === 401) {
        redirectToLogin(toast);
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create transaction");
      }
      
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/converted"] });
      toast({ title: "Success", description: "Transaction recorded successfully" });
    },
    onError: (error) => {
      if (!isUnauthorizedError(error as Error)) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
      }
    }
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateTransactionRequest> }) => {
      const url = buildUrl(api.transactions.update.path, { id });
      const res = await fetch(url, {
        method: api.transactions.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (res.status === 401) {
        redirectToLogin(toast);
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update transaction");
      }

      return await res.json() as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/converted"] });
      toast({ title: "Success", description: "Transaction updated" });
    },
    onError: (error) => {
      if (!isUnauthorizedError(error as Error)) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
      }
    }
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transactions.delete.path, { id });
      const res = await fetch(url, {
        method: api.transactions.delete.method,
        credentials: "include",
      });

      if (res.status === 401) {
        redirectToLogin(toast);
        throw new Error("Unauthorized");
      }

      if (!res.ok) throw new Error("Failed to delete transaction");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/converted"] });
      toast({ title: "Success", description: "Transaction deleted" });
    },
  });
}
