import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateBudgetRequest } from "@shared/routes";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";

export function useBudgets() {
  const { toast } = useToast();

  return useQuery({
    queryKey: [api.budgets.list.path],
    queryFn: async () => {
      const res = await fetch(api.budgets.list.path, { credentials: "include" });
      
      if (res.status === 401) {
        redirectToLogin(toast);
        return [];
      }
      
      if (!res.ok) throw new Error("Failed to fetch budgets");
      return api.budgets.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBudgetRequest) => {
      const res = await fetch(api.budgets.create.path, {
        method: api.budgets.create.method,
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
        throw new Error(error.message || "Failed to create budget");
      }
      
      return api.budgets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.budgets.list.path] });
      toast({ title: "Success", description: "Budget set successfully" });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.budgets.delete.path, { id });
      const res = await fetch(url, {
        method: api.budgets.delete.method,
        credentials: "include",
      });

      if (res.status === 401) {
        redirectToLogin(toast);
        throw new Error("Unauthorized");
      }

      if (!res.ok) throw new Error("Failed to delete budget");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.budgets.list.path] });
      toast({ title: "Success", description: "Budget removed" });
    },
  });
}
