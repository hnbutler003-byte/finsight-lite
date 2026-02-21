import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { insertTransactionSchema, type Transaction } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";

// Extend schema for form usage (coerce numbers)
const formSchema = insertTransactionSchema.extend({
  amount: z.coerce.number().positive("Amount must be positive"),
  categoryId: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TransactionForm({ children, transaction }: { children: React.ReactNode, transaction?: Transaction }) {
  const [open, setOpen] = useState(false);
  const { mutate: createTx, isPending: isCreating } = useCreateTransaction();
  const { mutate: updateTx, isPending: isUpdating } = useUpdateTransaction();
  const { data: categories } = useCategories();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: transaction ? Number(transaction.amount) : 0,
      description: transaction?.description || "",
      date: transaction ? new Date(transaction.date) : new Date(),
      currency: transaction?.currency || "BSD",
      type: transaction?.type || "expense",
      userId: transaction?.userId || "current", 
      categoryId: transaction?.categoryId || undefined,
    },
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        amount: Number(transaction.amount),
        description: transaction.description || "",
        date: new Date(transaction.date),
        currency: transaction.currency,
        type: transaction.type || "expense",
        categoryId: transaction.categoryId || undefined,
        userId: transaction.userId,
      });
    }
  }, [transaction, form]);
  
  const isPending = isCreating || isUpdating;
  
  const onSubmit = (data: FormValues) => {
    const payload = { ...data, amount: String(data.amount) };
    if (transaction) {
      updateTx({ id: transaction.id, data: payload }, {
        onSuccess: () => {
          setOpen(false);
        },
      });
    } else {
      createTx(payload, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={(val) => {
                    field.onChange(val);
                    form.setValue("categoryId", undefined);
                  }} value={field.value || "expense"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">💰 Income</SelectItem>
                      <SelectItem value="expense">💸 Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} className="font-mono text-lg" data-testid="input-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        value={(() => {
                          try {
                            if (!field.value) return '';
                            const d = new Date(field.value);
                            return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
                          } catch { return ''; }
                        })()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) field.onChange(new Date(val + 'T12:00:00'));
                        }}
                        data-testid="input-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => {
                const selectedType = form.watch("type") || "expense";
                const filteredCategories = categories?.filter(c => c.type === selectedType) || [];
                return (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.length > 0 ? (
                          Array.from(new Map(filteredCategories.map(c => [c.name, c])).values()).map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              <span className="flex items-center gap-2">
                                {cat.icon ? (
                                  <span className="w-4 h-4 flex items-center justify-center text-lg">{cat.icon}</span>
                                ) : (
                                  <span>{cat.type === 'income' ? '💰' : '💸'}</span>
                                )}
                                {cat.name}
                              </span>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No categories found
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Grocery shopping, Paycheck..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (transaction ? "Update Transaction" : "Save Transaction")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
