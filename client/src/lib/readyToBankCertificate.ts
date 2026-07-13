import { jsPDF } from "jspdf";
import finsightLogoUrl from "@assets/finsight-lite-logo-primary_1782158006266.jpg";

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

const TERRITORY_NAMES: Record<string, string> = {
  BSD: "The Bahamas",
  JMD: "Jamaica",
  TTD: "Trinidad and Tobago",
  BBD: "Barbados",
  XCD: "the Eastern Caribbean",
  GYD: "Guyana",
  HTG: "Haiti",
};

function getTerritoryName(territory: string): string {
  return TERRITORY_NAMES[territory] ?? territory;
}

function getDocumentChecklist(territory: string): string[] {
  if (territory === "BSD") {
    return [
      "A valid birth certificate",
      "A valid passport",
    ];
  }
  return [
    "A form of photo ID",
    "Your parent or guardian (required for minors)",
    "Ask your teacher or Org Admin to confirm exact requirements before your visit",
  ];
}

function getChecklistNote(territory: string): string {
  if (territory === "BSD") {
    return "These are the verified requirements for opening a minor account in The Bahamas.";
  }
  return "Exact requirements vary by bank. Confirm with your teacher or Org Admin before visiting.";
}

export async function buildReadyToBankDocument(
  studentName: string,
  territory: string,
  achievedDate: string,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  const logo = await loadImageAsPngDataUrl(finsightLogoUrl);

  const TEAL_R = 13, TEAL_G = 148, TEAL_B = 136;
  const GOLD_R = 212, GOLD_G = 175, GOLD_B = 55;
  const DARK_R = 15, DARK_G = 23, DARK_B = 42;

  const headerH = 26;
  doc.setFillColor(TEAL_R, TEAL_G, TEAL_B);
  doc.rect(0, 0, W, headerH, "F");

  if (logo) {
    const logoH = 14;
    const logoW = 14;
    doc.addImage(logo, "PNG", W - logoW - 12, (headerH - logoH) / 2, logoW, logoH);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("FinSight Lite", 14, headerH / 2 + 4.5);

  doc.setDrawColor(GOLD_R, GOLD_G, GOLD_B);
  doc.setLineWidth(1.2);
  doc.line(0, headerH, W, headerH);

  let y = headerH + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(TEAL_R, TEAL_G, TEAL_B);
  doc.text("Ready to Open a Bank Account", W / 2, y, { align: "center" });

  y += 5;
  doc.setDrawColor(GOLD_R, GOLD_G, GOLD_B);
  doc.setLineWidth(0.6);
  doc.line(30, y + 1, W - 30, y + 1);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  const warmNote =
    `This document confirms that ${studentName} has completed the Real Life Ready module ` +
    `on FinSight Lite. They have learned how to open a bank account in ` +
    `${getTerritoryName(territory)}, how to read a payslip, and how to avoid scams and ` +
    `financial fraud. They are prepared to take their first real banking step.`;
  const warmLines = doc.splitTextToSize(warmNote, W - 40);
  doc.text(warmLines, W / 2, y, { align: "center" });
  y += warmLines.length * 6 + 8;

  const panelX = 20;
  const panelW = W - 40;
  const checklist = getDocumentChecklist(territory);
  const panelH = 12 + checklist.length * 8 + 10;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(187, 247, 208);
  doc.setLineWidth(0.4);
  doc.roundedRect(panelX, y, panelW, panelH, 4, 4, "FD");

  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 83, 45);
  doc.text("What to bring to the bank:", panelX + 8, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  for (const item of checklist) {
    doc.text(`\u2022  ${item}`, panelX + 8, y);
    y += 7;
  }
  y += 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(getChecklistNote(territory), panelX, y);
  y += 12;

  const nameBoxX = 20;
  const nameBoxW = W - 40;
  const nameBoxH = 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(nameBoxX, y, nameBoxW, nameBoxH, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(DARK_R, DARK_G, DARK_B);
  doc.text(studentName, W / 2, y + 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Student", W / 2, y + 17, { align: "center" });
  y += nameBoxH + 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Achieved: ${achievedDate}`, W / 2, y, { align: "center" });

  const footerY = H - 14;
  doc.setFillColor(248, 250, 252);
  doc.rect(0, footerY - 6, W, 20, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(0, footerY - 6, W, footerY - 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("FinSight Lite  |  Financial Literacy for Caribbean Youth", W / 2, footerY + 1, { align: "center" });

  return doc;
}

export async function generateReadyToBankDocument(
  studentName: string,
  territory: string,
  achievedDate: string,
): Promise<void> {
  const doc = await buildReadyToBankDocument(studentName, territory, achievedDate);
  doc.save(`ReadyToBank_${studentName.replace(/\s+/g, "_")}.pdf`);
}

export async function buildReadyToBankDataUri(
  studentName: string,
  territory: string,
  achievedDate: string,
): Promise<string> {
  const doc = await buildReadyToBankDocument(studentName, territory, achievedDate);
  return doc.output("datauristring");
}
