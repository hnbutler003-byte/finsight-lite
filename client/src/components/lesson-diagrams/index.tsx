import { useEffect, useRef, useState, type ComponentType } from "react";
import { BankAccountStepsDiagram } from "./BankAccountStepsDiagram";
import { PayslipBreakdownDiagram } from "./PayslipBreakdownDiagram";
import { ChequingVsSavingsDiagram } from "./ChequingVsSavingsDiagram";

// Registry of custom-coded lesson diagrams. Lesson content sections reference
// these by their diagramKey. Adding a new diagram means adding a component
// here, the same way icons and other structured UI elements are handled.
export const LESSON_DIAGRAMS: Record<string, ComponentType> = {
  "bank-account-steps": BankAccountStepsDiagram,
  "payslip-breakdown": PayslipBreakdownDiagram,
  "chequing-vs-savings": ChequingVsSavingsDiagram,
};

// Renders the diagram registered for a section's diagramKey, with a subtle
// pop-in as it scrolls into view. Unknown or missing keys render nothing so
// a bad key can never crash the lesson page.
export function LessonDiagramSlot({ diagramKey, index }: { diagramKey?: string; index: number }) {
  const Diagram = diagramKey ? LESSON_DIAGRAMS[diagramKey] : undefined;
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!Diagram) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No observer support: show the diagram immediately, never leave it hidden.
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [Diagram]);

  if (!Diagram) return null;

  return (
    <div
      ref={ref}
      className={inView ? "animate-pop-in" : "opacity-0"}
      data-testid={`lesson-diagram-slot-${index}`}
    >
      <Diagram />
    </div>
  );
}
