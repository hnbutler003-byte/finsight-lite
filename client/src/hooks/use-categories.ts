import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertCategory } from "@shared/routes";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";

export function useCategories() {
  const { toast } = useToast();

  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path, { credentials: "include" });
      
      if (res.status === 401) {
        redirectToLogin(toast);
        return [];
      }
      
      if (!res.ok) throw new Error("Failed to fetch categories");
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCategory) => {
      const res = await fetch(api.categories.create.path, {
        method: api.categories.create.method,
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
        throw new Error(error.message || "Failed to create category");
      }
      
      return api.categories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      toast({ title: "Success", description: "Category created" });
    },
  });
}
