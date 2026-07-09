import { Wallet, PiggyBank, Check } from "lucide-react";

const CHEQUING_POINTS = [
  "Built for everyday spending",
  "Frequent deposits and withdrawals",
  "Often comes with a debit card",
  "Little to no interest earned",
  "Use for allowance, wages, and bills",
];

const SAVINGS_POINTS = [
  "Built to hold money over time",
  "Limited withdrawals before fees",
  "Usually no debit card",
  "Earns a small amount of interest",
  "Use for savings goals and emergencies",
];

export function ChequingVsSavingsDiagram() {
  return (
    <div className="glass-card rounded-glass p-6" data-testid="diagram-chequing-vs-savings">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-violet-500/30 overflow-hidden" data-testid="card-chequing">
          <div className="bg-violet-500/15 dark:bg-violet-500/20 px-4 py-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-violet-700 dark:text-violet-300 flex-shrink-0" />
            <h4 className="font-display font-bold text-violet-800 dark:text-violet-200">Chequing account</h4>
          </div>
          <ul className="p-4 space-y-2">
            {CHEQUING_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground" data-testid={`chequing-point-${i}`}>
                <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-500/30 overflow-hidden" data-testid="card-savings">
          <div className="bg-amber-500/15 dark:bg-amber-500/20 px-4 py-3 flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-amber-700 dark:text-amber-300 flex-shrink-0" />
            <h4 className="font-display font-bold text-amber-800 dark:text-amber-200">Savings account</h4>
          </div>
          <ul className="p-4 space-y-2">
            {SAVINGS_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground" data-testid={`savings-point-${i}`}>
                <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
