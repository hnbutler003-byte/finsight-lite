import { jsPDF } from "jspdf";
import logoUrl from "@assets/finsight-lite-logo-primary_1782158006266.jpg";

async function loadImageAsPngDataUrl(src: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 200;
    canvas.height = img.naturalHeight || 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function drawGradientRule(doc: jsPDF, x: number, y: number, width: number, height: number) {
  const segments = 30;
  const segW = width / segments;
  const colors: [number, number, number][] = [
    [109, 40, 217],
    [139, 92, 246],
    [196, 181, 253],
    [251, 146, 60],
    [249, 115, 22],
    [20, 184, 166],
    [13, 148, 136],
  ];
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const ci = Math.floor(t * (colors.length - 1));
    const ci2 = Math.min(ci + 1, colors.length - 1);
    const cf = t * (colors.length - 1) - ci;
    const r = Math.round(colors[ci][0] + cf * (colors[ci2][0] - colors[ci][0]));
    const g = Math.round(colors[ci][1] + cf * (colors[ci2][1] - colors[ci][1]));
    const b = Math.round(colors[ci][2] + cf * (colors[ci2][2] - colors[ci][2]));
    doc.setFillColor(r, g, b);
    doc.rect(x + i * segW, y, segW + 0.5, height, "F");
  }
}

export type ImpactData = {
  className: string;
  teacherName: string;
  orgName?: string | null;
  firstJoinDate: string | null;
  totalStudents: number;
  lessonsCompleted: number;
  possibleLessons: number;
  avgScore: number;
  totalTrades: number;
  topStudentName: string;
  mostCompletedModule: string | null;
  leastCompletedModule: string | null;
};

function formatDate(d: string | null): string {
  if (!d) return "N/A";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return d; }
}

export async function generateImpactSummaryPdf(data: ImpactData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  const logoDataUrl = await loadImageAsPngDataUrl(logoUrl);
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", W - 48, 10, 36, 36);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(109, 40, 217);
  doc.text("FINSIGHT LITE", 14, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  doc.text("www.finsightlite.com", 14, 28);

  drawGradientRule(doc, 14, 50, W - 28, 2.5);

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 30, 50);
  doc.text("Impact Summary", 14, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 70, 90);
  doc.text(`${data.className}`, 14, 74);

  doc.setFontSize(9);
  doc.setTextColor(100, 110, 130);
  doc.text(`Teacher: ${data.teacherName}`, 14, 81);
  if (data.orgName) doc.text(`Organization: ${data.orgName}`, 14, 87);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Period: ${formatDate(data.firstJoinDate)} to ${today}`, 14, data.orgName ? 93 : 87);

  let y = data.orgName ? 106 : 100;

  drawGradientRule(doc, 14, y - 4, W - 28, 1);
  y += 6;

  const statRows: [string, string][] = [
    ["Total students enrolled", String(data.totalStudents)],
    ["Lessons completed", `${data.lessonsCompleted} out of ${data.possibleLessons} possible`],
    ["Average quiz score", `${data.avgScore}%`],
    ["Total simulated trades made", String(data.totalTrades)],
    ["Most active student", data.topStudentName],
    ["Most completed lesson", data.mostCompletedModule || "None recorded"],
    ["Least completed lesson", data.leastCompletedModule || "None recorded"],
  ];

  for (const [label, value] of statRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40, 50, 70);
    doc.text(label, 14, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 110);
    doc.text(value, W - 14, y, { align: "right", maxWidth: 100 });

    doc.setDrawColor(220, 220, 235);
    doc.setLineWidth(0.2);
    doc.line(14, y + 2, W - 14, y + 2);
    y += 12;
  }

  y += 6;
  doc.setFillColor(245, 245, 252);
  doc.setDrawColor(200, 200, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, W - 28, 28, 3, 3, "FD");

  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(60, 70, 100);
  const closing = "Powered by Finsight Lite, the Caribbean's financial literacy platform for students ages 12 to 17. www.finsightlite.com";
  const lines = doc.splitTextToSize(closing, W - 44) as string[];
  doc.text(lines, W / 2, y + 10, { align: "center" });

  drawGradientRule(doc, 0, H - 12, W, 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 170);
  doc.text(`Generated ${today}`, W / 2, H - 4, { align: "center" });

  const safeName = data.className.replace(/[^a-z0-9 ]/gi, "").trim().replace(/\s+/g, "_");
  doc.save(`${safeName}_Impact_Summary.pdf`);
}
