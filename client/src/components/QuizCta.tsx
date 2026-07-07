import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuizCtaProps {
  subtitle: string;
  buttonTestId: string;
  onStart: () => void;
}

export function QuizCta({ subtitle, buttonTestId, onStart }: QuizCtaProps) {
  return (
    <Card className="glass-card-coral rounded-glass border-0">
      <CardContent className="p-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">Ready to test yourself?</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Button
          onClick={onStart}
          className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-6 shadow-lg shrink-0 border border-orange-600/40"
          data-testid={buttonTestId}
        >
          Start Quiz
        </Button>
      </CardContent>
    </Card>
  );
}
