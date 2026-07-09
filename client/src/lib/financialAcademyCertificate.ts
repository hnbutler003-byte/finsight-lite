import { jsPDF } from "jspdf";
import finsightLogoUrl from "@assets/finsight-lite-logo-primary_1782158006266.jpg";

export type FinancialAcademyBranding = {
  logoUrl?: string | null;
  leftName?: string | null;
  leftRole?: string | null;
  rightName?: string | null;
  rightRole?: string | null;
};

async function loadImageAsPngDataUrl(src: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function buildFinancialAcademyCertificate(
  studentFullName: string,
  moduleName: string,
  completionDate: string,
  branding?: FinancialAcademyBranding,
): Promise<jsPDF> {
  const leftName = branding?.leftName?.trim() || "";
  const leftRole = branding?.leftRole?.trim() || "";
  const rightName = branding?.rightName?.trim() || "";
  const rightRole = branding?.rightRole?.trim() || "";
  const logoSource = branding?.logoUrl?.trim() || finsightLogoUrl;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(2);
  doc.rect(8, 8, W - 16, H - 16, "S");

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, W - 24, H - 24, "S");

  const logo = await loadImageAsPngDataUrl(logoSource);
  if (logo) {
    const logoW = 38;
    const logoH = 38;
    doc.addImage(logo, "PNG", (W - logoW) / 2, 18, logoW, logoH);
  }

  doc.setFont("times", "bold");
  doc.setFontSize(38);
  doc.setTextColor(212, 175, 55);
  doc.text("CERTIFICATE", W / 2, 72, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(16);
  doc.setTextColor(60, 60, 60);
  doc.text("OF COMPLETION", W / 2, 82, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(110, 110, 110);
  doc.text("IS PRESENTED TO :", W / 2, 92, { align: "center" });

  doc.setFont("times", "bolditalic");
  doc.setFontSize(34);
  doc.setTextColor(30, 30, 30);
  const safeName = (studentFullName || "Student").trim();
  doc.text(safeName, W / 2, 116, { align: "center" });

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  const nameWidth = doc.getTextWidth(safeName);
  const underlineHalf = Math.min(Math.max(nameWidth / 2 + 10, 50), 110);
  doc.line(W / 2 - underlineHalf, 121, W / 2 + underlineHalf, 121);

  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(50, 50, 50);
  const bodyLine = `for successfully completing the "${moduleName}".`;
  doc.text(bodyLine, W / 2, 134, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`Date of Completion: ${completionDate}`, W / 2, 144, { align: "center" });

  const sigY = 178;
  const leftX = 70;
  const rightX = W - 70;

  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.4);
  doc.line(leftX - 35, sigY - 6, leftX + 35, sigY - 6);
  doc.line(rightX - 35, sigY - 6, rightX + 35, sigY - 6);

  const drawSignatureBlock = (x: number, name: string, role: string) => {
    if (name) {
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text(name, x, sigY, { align: "center" });
    }
    // With no name set, show a generic non-fake label under the line instead.
    const label = role || (name ? "" : "Instructor Signature");
    if (label) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(label, x, name ? sigY + 5 : sigY, { align: "center" });
    }
  };
  drawSignatureBlock(leftX, leftName, leftRole);
  drawSignatureBlock(rightX, rightName, rightRole);

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text("FinSight Lite", W / 2, H - 14, { align: "center" });

  return doc;
}

export async function generateFinancialAcademyCertificate(
  studentFullName: string,
  moduleName: string,
  completionDate: string,
  branding?: FinancialAcademyBranding,
): Promise<void> {
  const doc = await buildFinancialAcademyCertificate(studentFullName, moduleName, completionDate, branding);
  const safeMod = moduleName.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
  doc.save(`Certificate_${safeMod}.pdf`);

  try {
    const dataUri = doc.output("datauristring");
    const pdfBase64 = dataUri.split(",")[1];
    if (pdfBase64) {
      void fetch("/api/certificates/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, lessonTitle: moduleName, kind: "module", sendToGuardian: true }),
      }).catch(() => {});
    }
  } catch {}
}

export async function renderFinancialAcademyCertificateDataUri(
  studentFullName: string,
  moduleName: string,
  completionDate: string,
  branding?: FinancialAcademyBranding,
): Promise<string> {
  const doc = await buildFinancialAcademyCertificate(studentFullName, moduleName, completionDate, branding);
  return doc.output("datauristring");
}
