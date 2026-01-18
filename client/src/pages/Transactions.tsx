import { useTransactions, useDeleteTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { Sidebar } from "@/components/layout/Sidebar";
import { Loader2, Trash2, Filter, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Transactions() {
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const { data: transactions, isLoading } = useTransactions({ categoryId: categoryFilter });
  const { data: categories } = useCategories();
  const { mutate: deleteTx } = useDeleteTransaction();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Transactions</h1>
              <p className="text-muted-foreground">Manage and track every dollar.</p>
            </div>
            <div className="flex gap-2">
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <div>
                       <Select onValueChange={(val) => setCategoryFilter(val === 'all' ? undefined : val)}>
                        <SelectTrigger className="w-[180px] bg-white">
                          <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Filter Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                     </div>
                   </TooltipTrigger>
                   <TooltipContent>
                     <p>Filter your transactions by category</p>
                   </TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <div>
                      <TransactionForm>
                        <Button>Add New</Button>
                      </TransactionForm>
                     </div>
                   </TooltipTrigger>
                   <TooltipContent>
                     <p>Record a new income or expense</p>
                   </TooltipContent>
                 </Tooltip>
               </TooltipProvider>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : transactions?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p>No transactions found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground font-medium uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {transactions?.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-mono text-muted-foreground">
                          {format(new Date(tx.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 font-medium">{tx.description}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary-foreground">
                            <span>{tx.category?.icon || '📁'}</span>
                            <span>{tx.category?.name || 'Uncategorized'}</span>
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-mono font-medium ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {Number(tx.amount) > 0 ? '+' : ''}${Math.abs(Number(tx.amount)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <AlertDialog>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remove this record</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently remove this transaction from your records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteTx(tx.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
