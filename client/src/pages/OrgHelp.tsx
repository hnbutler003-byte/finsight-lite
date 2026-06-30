import ReactMarkdown from "react-markdown";
import { OrgSidebar } from "@/components/layout/OrgSidebar";
import orgGuideRaw from "../../../docs/org-guide.md?raw";

export default function OrgHelp() {
  return (
    <div className="flex min-h-screen bg-background console">
      <OrgSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="font-bold text-2xl text-foreground">Help Center</h1>
            <p className="text-muted-foreground text-sm mt-1">Everything you need to get the most out of the Org Admin portal.</p>
          </div>
          <div className="console-card rounded-xl border p-6 md:p-8 md-prose">
            <ReactMarkdown>{orgGuideRaw}</ReactMarkdown>
          </div>
        </div>
      </main>
    </div>
  );
}
