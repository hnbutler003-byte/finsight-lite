import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

type Props = {
  level: number;
  onClose: () => void;
};

const LEVEL_MESSAGES: Record<number, string> = {
  2: "You just reached Level 2. You have made your first real move toward financial knowledge. The journey has started.",
  3: "You just reached Level 3. You know more about money than most students your age. Keep going.",
  4: "You just reached Level 4. You are building skills that most adults do not have yet. Keep going.",
  5: "You just reached Level 5. That means you have learned more about money than most adults in the Caribbean. Keep going.",
  6: "You just reached Level 6. You understand budgeting, saving, and investing at a level most people never reach. Keep going.",
  7: "You just reached Level 7. Very few students get here. You are doing something rare. Keep going.",
  8: "You just reached Level 8. You now know more about money than the average adult in the Caribbean. Keep going.",
  9: "You just reached Level 9. You are close to the top. Only a small percentage of students ever reach this point.",
  10: "You just reached Level 10. That is the highest level. You have mastered financial literacy at a level most adults never reach. Respect.",
};

function getLevelMessage(level: number): string {
  return LEVEL_MESSAGES[level] ?? `You just reached Level ${level}. Keep building your financial knowledge. Every lesson brings you closer.`;
}

export function LevelUpModal({ level, onClose }: Props) {
  const message = getLevelMessage(level);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-level-up"
    >
      <div className="glass-card-coral rounded-glass p-8 max-w-md w-full text-center shadow-2xl animate-bounce-in">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="mb-2">
          <span className="inline-block bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider">
            Level Up
          </span>
        </div>

        <h2 className="font-display text-3xl font-bold text-foreground mt-3 mb-4" data-testid="text-level-up-headline">
          Level {level}
        </h2>

        <p className="font-sans text-base text-muted-foreground leading-relaxed mb-6" data-testid="text-level-up-message">
          {message}
        </p>

        <Button
          onClick={onClose}
          className="rounded-2xl bg-gradient-to-r from-coral-500 to-amber-500 text-white font-bold px-8 shadow-lg w-full"
          style={{ background: "linear-gradient(135deg, hsl(16 100% 62%), hsl(38 92% 50%))" }}
          data-testid="button-level-up-close"
        >
          Keep Going
        </Button>
      </div>
    </div>
  );
}
