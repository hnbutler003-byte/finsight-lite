export function PayslipBreakdownDiagram() {
  return (
    <div className="glass-card rounded-glass p-6" data-testid="diagram-payslip-breakdown">
      <h3 className="font-display font-bold text-lg text-foreground mb-4">Weekly payslip</h3>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 px-3 py-3" data-testid="payslip-row-gross">
          <span className="text-sm font-medium text-foreground">Gross pay</span>
          <span className="font-display font-bold text-foreground">B$400.00</span>
        </div>
        <div className="border-t border-border/70" aria-hidden="true" />
        <div
          className="flex items-baseline justify-between gap-3 px-3 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
          data-testid="payslip-row-nib"
        >
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">NIB deduction</span>
          <span className="font-display font-bold text-amber-800 dark:text-amber-200">-B$15.60</span>
        </div>
        <div className="border-t border-border/70" aria-hidden="true" />
        <div
          className="px-3 py-3 rounded-xl bg-teal-500/10 border border-teal-500/30"
          data-testid="payslip-row-net"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">Net pay</span>
            <span className="font-display font-bold text-teal-800 dark:text-teal-200">B$384.40</span>
          </div>
          <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">What actually lands in your account</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Sample amounts for illustration, actual NIB rates can change.
      </p>
    </div>
  );
}
