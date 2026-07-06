import { jsPDF } from "jspdf";
import JSZip from "jszip";
import logoUrl from "@assets/finsight-lite-logo-primary_1782158006266.jpg";

export type CertStudent = {
  name: string;
  xp: number;
  lessonsCompleted: number;
  trades: number;
  avgScore: number;
};

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
    [124, 58, 237],
    [139, 92, 246],
    [167, 139, 250],
    [196, 181, 253],
    [234, 149, 100],
    [251, 146, 60],
    [249, 115, 22],
    [234, 88, 12],
    [20, 184, 166],
    [13, 148, 136],
    [15, 118, 110],
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

async function buildStudentCert(
  student: CertStudent,
  className: string,
  teacherName: string,
  orgName: string,
  completionDate: string,
  logoDataUrl: string | null,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  doc.setDrawColor(230, 230, 240);
  doc.setLineWidth(1.5);
  doc.rect(7, 7, W - 14, H - 14, "S");
  doc.setDrawColor(210, 210, 225);
  doc.setLineWidth(0.4);
  doc.rect(11, 11, W - 22, H - 22, "S");

  if (logoDataUrl) {
    const logoW = 42;
    const logoH = 42;
    doc.addImage(logoDataUrl, "PNG", W - logoW - 14, 14, logoW, logoH);
  }

  drawGradientRule(doc, 14, 62, W - 28, 2.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(109, 40, 217);
  doc.text("FINSIGHT LITE", 16, 30);

  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.setTextColor(20, 30, 50);
  doc.text("CERTIFICATE OF COMPLETION", W / 2, 48, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 120);
  doc.text("PRESENTED TO", W / 2, 76, { align: "center" });

  doc.setFont("times", "bolditalic");
  doc.setFontSize(36);
  doc.setTextColor(20, 30, 50);
  doc.text(student.name, W / 2, 96, { align: "center" });

  doc.setDrawColor(109, 40, 217);
  doc.setLineWidth(0.6);
  const nw = Math.min(doc.getTextWidth(student.name) / 2 + 12, 110);
  doc.line(W / 2 - nw, 100, W / 2 + nw, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(50, 60, 80);
  doc.text(`for completing the FinSight Lite Financial Literacy Program`, W / 2, 110, { align: "center" });
  doc.text(`${className} | Teacher: ${teacherName}`, W / 2, 117, { align: "center" });

  const statsY = 130;
  const stats = [
    { label: "XP Earned", value: String(student.xp) },
    { label: "Lessons Done", value: `${student.lessonsCompleted}/9` },
    { label: "Trades Made", value: String(student.trades) },
    { label: "Avg Quiz Score", value: `${student.avgScore}%` },
  ];
  const boxW = 48;
  const gap = 10;
  const totalW = stats.length * boxW + (stats.length - 1) * gap;
  const startX = (W - totalW) / 2;

  for (let i = 0; i < stats.length; i++) {
    const bx = startX + i * (boxW + gap);
    doc.setFillColor(245, 245, 252);
    doc.setDrawColor(200, 200, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(bx, statsY, boxW, 22, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(109, 40, 217);
    doc.text(stats[i].value, bx + boxW / 2, statsY + 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 120);
    doc.text(stats[i].label.toUpperCase(), bx + boxW / 2, statsY + 19, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 140);
  doc.text(`Date of Completion: ${completionDate}`, W / 2, H - 24, { align: "center" });

  drawGradientRule(doc, 14, H - 18, W - 28, 1.5);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 150);
  const footerText = orgName && orgName !== "FinSight Lite"
    ? `Issued by Finsight Lite in partnership with ${orgName}`
    : "Issued by Finsight Lite";
  doc.text(footerText, W / 2, H - 11, { align: "center" });

  return doc;
}

export async function generateTeacherCertificatesZip(
  students: CertStudent[],
  className: string,
  teacherName: string,
  orgName: string,
): Promise<void> {
  if (students.length === 0) return;

  const completionDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const logoDataUrl = await loadImageAsPngDataUrl(logoUrl);

  const zip = new JSZip();
  const folder = zip.folder("FinSight_Lite_Certificates") ?? zip;

  for (const student of students) {
    const doc = await buildStudentCert(student, className, teacherName, orgName, completionDate, logoDataUrl);
    const pdfBytes = doc.output("arraybuffer");
    const safeName = student.name.replace(/[^a-z0-9 ]/gi, "").trim().replace(/\s+/g, "_") || "Student";
    folder.file(`${safeName}_Certificate.pdf`, pdfBytes);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${className.replace(/[^a-z0-9 ]/gi, "").trim().replace(/\s+/g, "_")}_Certificates.zip`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
}
