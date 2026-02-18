import { useBudgets, useCreateBudget, useDeleteBudget } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { useStats } from "@/hooks/use-stats";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBudgetSchema } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";
import { Loader2, Trash2, Plus, Wallet, HelpCircle } from "lucide-react";

// Extend schema for form usage (coerce numbers)
const formSchema = insertBudgetSchema.extend({
  amount: z.coerce.number().positive(),
  categoryId: z.coerce.number(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Budgets() {
  const { data: budgets, isLoading } = useBudgets();
  const { data: categories } = useCategories();
  const { mutate: deleteBudget } = useDeleteBudget();
  const { mutate: createBudget, isPending: isCreating } = useCreateBudget();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      period: "monthly",
      userId: "current",
    }
  });

  const onSubmit = (data: FormValues) => {
    createBudget(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  const { data: stats } = useStats({ period: 'monthly' });

  const totalBudgeted = budgets?.reduce((acc, b) => acc + Number(b.amount), 0) || 0;
  const totalIncome = stats?.totalIncome || 0;
  const allocationPercentage = totalIncome > 0 ? Math.min((totalBudgeted / totalIncome) * 100, 100) : 0;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Monthly Budgets</h1>
              <p className="text-muted-foreground">Set limits and reach your saving goals.</p>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Dialog open={open} onOpenChange={setOpen}>
                      <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-primary/20">
                          <Plus className="mr-2 w-4 h-4" /> Set Budget
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Budget</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                            <FormField
                              control={form.control}
                              name="categoryId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Array.from(new Map(categories?.filter(c => c.type === 'expense').map(c => [c.name, c])).values()).map((cat) => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>
                                          <span className="flex items-center gap-2">
                                            {cat.icon ? <span>{cat.icon}</span> : '💸'} {cat.name}
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="amount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Limit Amount ($)</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button type="submit" className="w-full" disabled={isCreating}>
                              {isCreating ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Budget"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a spending limit for a specific category</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {budgets?.map((budget) => {
                  const spent = Number((budget as any).spent || 0);
                  const limit = Number(budget.amount);
                  const percentage = Math.min((spent / limit) * 100, 100);
                  
                  return (
                    <TooltipProvider key={budget.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-all cursor-help">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                  <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{budget.category?.name}</h3>
                                  <p className="text-xs text-muted-foreground capitalize">{budget.period} Limit</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => deleteBudget(budget.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-sm font-medium">
                                <span className="text-muted-foreground">Spent: ${spent.toFixed(2)}</span>
                                <span>Limit: ${limit.toFixed(2)}</span>
                              </div>
                              <Progress value={percentage} className="h-2" indicatorClassName={percentage > 90 ? "bg-destructive" : "bg-primary"} />
                              <p className="text-xs text-right text-muted-foreground pt-1">
                                {percentage.toFixed(0)}% used
                              </p>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Stay on track with your spending goals</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
                {budgets?.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                    <p>No budgets set up yet. Create one to start saving!</p>
                  </div>
                )}
              </div>

              {/* Budget Allocation Summary */}
              {budgets && budgets.length > 0 && (
                <div className="mt-12 bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-bold text-foreground">Budget Allocation</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>How much of your monthly salary is allocated to budgets</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Total Budgeted: <span className="text-foreground font-bold">${totalBudgeted.toFixed(2)}</span>
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Income Allocation</span>
                      <span className={allocationPercentage > 100 ? "text-destructive font-bold" : "text-primary font-bold"}>
                        {allocationPercentage.toFixed(1)}% of Income
                      </span>
                    </div>
                    <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${allocationPercentage > 90 ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${allocationPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {allocationPercentage > 100 
                        ? "Warning: Your budgets exceed your total income!" 
                        : "You've allocated this portion of your monthly income to these category limits."}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
