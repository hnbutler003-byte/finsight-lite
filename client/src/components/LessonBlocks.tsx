import { useVideoEmbed } from "@/hooks/use-video-embed";
import { LessonDiagramSlot } from "@/components/lesson-diagrams";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play, AlertTriangle, BookOpen, BarChart3, CheckCircle2, ChevronRight, ListChecks } from "lucide-react";
import type { ContentSection, ContentDiagram } from "@shared/schema";

export type { ContentSection, ContentDiagram };

// Inline markdown bold: renders **term** segments as <strong>. Anything not
// wrapped in double asterisks passes through unchanged as plain text.
function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Lesson body text uses blank lines as paragraph breaks. Render each paragraph
// in its own <p> tag so multi-topic sections read naturally.
export function BodyParagraphs({ body, index, pClassName, wrapperClassName }: {
  body: string;
  index: number;
  pClassName?: string;
  wrapperClassName?: string;
}) {
  const paragraphs = body.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);
  return (
    <div className={wrapperClassName ?? "space-y-3 mb-3"} data-testid={`section-body-${index}`}>
      {paragraphs.map((p, i) => (
        <p key={i} className={pClassName ?? "text-foreground text-sm leading-relaxed"}>{renderInlineBold(p)}</p>
      ))}
    </div>
  );
}

export function SectionVideoBlock({ section, index }: { section: ContentSection; index: number }) {
  const { embedUrl, isLoading, isError } = useVideoEmbed(section.video_url ?? "");

  return (
    <Card className="glass-card rounded-glass border-0 overflow-hidden">
      <CardContent className="p-6">
        <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Play className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          {section.heading}
        </h2>
        {section.body && (
          <BodyParagraphs body={section.body} index={index} />
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-3 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">This video isn't available right now.</p>
          </div>
        )}
        {embedUrl && (
          <div className="aspect-video w-full rounded-xl overflow-hidden">
            <iframe
              src={embedUrl}
              title={section.heading}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              data-testid={`section-video-${index}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SectionDiagram({ diagram, index }: { diagram: ContentDiagram; index: number }) {
  if (diagram.kind === "bars") {
    const max = Math.max(...diagram.items.map(it => it.value), 1);
    return (
      <div data-testid={`section-diagram-${index}`}>
        <div className="space-y-3">
          {diagram.items.map((it, j) => (
            <div key={j}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">{it.label}</span>
                <span className="text-sm font-bold text-teal-700 dark:text-teal-300">{it.display ?? it.value.toLocaleString()}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                  style={{ width: `${Math.max((it.value / max) * 100, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {diagram.note && <p className="text-xs text-muted-foreground mt-3">{diagram.note}</p>}
      </div>
    );
  }

  if (diagram.kind === "steps") {
    return (
      <div data-testid={`section-diagram-${index}`}>
        <ol className="space-y-3">
          {diagram.items.map((it, j) => (
            <li key={j} className="flex items-start gap-3" style={{ marginLeft: `${j * 12}px` }}>
              <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-700 dark:text-amber-300 font-bold text-xs">{j + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{it.label}</p>
                {it.detail && <p className="text-xs text-muted-foreground mt-0.5">{it.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
        {diagram.note && <p className="text-xs text-muted-foreground mt-3">{diagram.note}</p>}
      </div>
    );
  }

  return (
    <div data-testid={`section-diagram-${index}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
          <p className="text-sm font-bold text-teal-800 dark:text-teal-200 mb-2">{diagram.left.title}</p>
          <ul className="space-y-1.5">
            {diagram.left.points.map((pt, j) => (
              <li key={j} className="flex items-start gap-2 text-xs text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">{diagram.right.title}</p>
          <ul className="space-y-1.5">
            {diagram.right.points.map((pt, j) => (
              <li key={j} className="flex items-start gap-2 text-xs text-foreground">
                <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {diagram.note && <p className="text-xs text-muted-foreground mt-3">{diagram.note}</p>}
    </div>
  );
}

export function LessonContentBlock({ section, index }: { section: ContentSection; index: number }) {
  // Custom-coded diagram rendered as a sibling AFTER this section's card, so
  // it sits between this section and the next in the lesson flow (the parent
  // space-y wrapper handles spacing). Unknown keys render nothing.
  const diagramSlot = <LessonDiagramSlot diagramKey={section.diagramKey} index={index} />;

  if (section.type === "video" && section.video_url) {
    return (
      <>
        <SectionVideoBlock section={section} index={index} />
        {diagramSlot}
      </>
    );
  }

  const isDiagram = section.type === "diagram" && !!section.diagram;
  return (
    <>
    <Card className="glass-card rounded-glass border-0">
      <CardContent className="p-6">
        <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDiagram ? "bg-teal-500/20" : "bg-amber-500/20"}`}>
            {isDiagram
              ? <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              : <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          </div>
          {section.heading}
        </h2>
        {section.body && (
          <BodyParagraphs body={section.body} index={index} />
        )}
        {isDiagram && <SectionDiagram diagram={section.diagram!} index={index} />}
        {section.examples && section.examples.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" /> Examples
            </p>
            <div className="flex flex-wrap gap-2">
              {section.examples.map((ex, j) => (
                <span key={j} className="text-sm bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl font-medium" data-testid={`example-${index}-${j}`}>
                  {ex}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    {diagramSlot}
    </>
  );
}
