import ReactMarkdown from "react-markdown";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import teacherGuideRaw from "../../../docs/teacher-guide.md?raw";

export default function TeacherHelp() {
  return (
    <div className="flex min-h-screen bg-background console">
      <TeacherSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="font-bold text-2xl text-foreground">Help Center</h1>
            <p className="text-muted-foreground text-sm mt-1">Everything you need to get the most out of the Teacher Portal.</p>
          </div>
          <div className="console-card rounded-xl border p-6 md:p-8 md-prose">
            <ReactMarkdown>{teacherGuideRaw}</ReactMarkdown>
          </div>
        </div>
      </main>
    </div>
  );
}
