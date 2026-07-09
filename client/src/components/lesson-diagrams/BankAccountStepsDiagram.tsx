const STEPS = [
  { title: "Choose account type", subtitle: "Chequing for everyday spending, savings for money you are setting aside" },
  { title: "Gather your documents", subtitle: "A valid ID and proof of address, like a utility bill" },
  { title: "Bring a parent or guardian", subtitle: "Required for anyone under 18, with their own ID" },
  { title: "Visit the bank", subtitle: "Complete the application together" },
  { title: "Make initial deposit", subtitle: "Your account is opened" },
];

export function BankAccountStepsDiagram() {
  return (
    <div className="glass-card rounded-glass p-6" data-testid="diagram-bank-account-steps">
      <h3 className="font-display font-bold text-lg text-foreground mb-4">
        Opening an account, step by step
      </h3>
      <ol className="space-y-0">
        {STEPS.map((step, i) => (
          <li key={i} className="flex items-stretch gap-4" data-testid={`bank-step-${i}`}>
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-violet-600 dark:bg-violet-500 flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-white text-sm">{i + 1}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-0.5 flex-1 min-h-6 bg-violet-500/30 dark:bg-violet-400/30" aria-hidden="true" />
              )}
            </div>
            <div className={`flex-1 min-w-0 ${i < STEPS.length - 1 ? "pb-5" : ""}`}>
              <p className="font-display font-semibold text-foreground leading-snug pt-1.5">{step.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{step.subtitle}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
