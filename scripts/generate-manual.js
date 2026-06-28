#!/usr/bin/env node
/**
 * Generates the FinSight Lite User Manual as a PDF.
 * Run with:  node scripts/generate-manual.js
 * Output:    docs/FinSight_Lite_User_Manual.pdf
 */

import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../docs");
const OUT_FILE = path.join(OUT_DIR, "FinSight_Lite_User_Manual.pdf");

fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Colour palette ──────────────────────────────────────────────────────────
const C = {
  navy:     "#1a2e6b",
  teal:     "#0d9488",
  amber:    "#d97706",
  slate:    "#475569",
  light:    "#f1f5f9",
  white:    "#ffffff",
  black:    "#0f172a",
  muted:    "#94a3b8",
  divider:  "#cbd5e1",
};

// ─── Document setup ──────────────────────────────────────────────────────────
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  info: {
    Title:    "FinSight Lite – User Manual",
    Author:   "FinSight",
    Subject:  "Complete user guide for all roles",
    Keywords: "finsight, financial literacy, user manual",
  },
  autoFirstPage: false,
});

const stream = fs.createWriteStream(OUT_FILE);
doc.pipe(stream);

// ─── Page-number tracking ─────────────────────────────────────────────────────
let pageNum = 0;
doc.on("pageAdded", () => {
  pageNum++;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PW = 595.28 - 72 * 2; // usable page width

function addPage() {
  doc.addPage();
  // footer
  doc
    .save()
    .fontSize(8)
    .fillColor(C.muted)
    .text(
      `FinSight Lite  •  User Manual  •  Page ${pageNum}`,
      72,
      doc.page.height - 50,
      { width: PW, align: "center" }
    )
    .restore();
  doc.moveDown(0);
}

function coverPage() {
  doc.addPage();

  // Background band
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.navy);

  // Accent strip
  doc.rect(0, doc.page.height * 0.55, doc.page.width, 8).fill(C.teal);

  // Title
  doc
    .fillColor(C.white)
    .fontSize(42)
    .font("Helvetica-Bold")
    .text("FinSight Lite", 72, 200, { width: PW, align: "center" });

  doc
    .fontSize(22)
    .font("Helvetica")
    .fillColor("#a5f3fc")
    .text("User Manual", 72, 260, { width: PW, align: "center" });

  doc
    .fontSize(13)
    .fillColor(C.white)
    .text(
      "Complete guide for Students, Teachers,\nOrganisation Admins & Super Admins",
      72,
      310,
      { width: PW, align: "center", lineGap: 4 }
    );

  doc
    .fontSize(10)
    .fillColor(C.muted)
    .text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 72, doc.page.height - 100, {
      width: PW,
      align: "center",
    });
}

function sectionCover(title, subtitle, color = C.teal) {
  addPage();
  const mid = (doc.page.height - 150) / 2;
  doc.rect(0, mid - 30, doc.page.width, 150).fill(color);
  doc
    .fillColor(C.white)
    .fontSize(30)
    .font("Helvetica-Bold")
    .text(title, 72, mid, { width: PW, align: "center" });
  if (subtitle) {
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#e2e8f0")
      .text(subtitle, 72, mid + 44, { width: PW, align: "center" });
  }
}

function h1(text) {
  doc
    .moveDown(0.5)
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(C.navy)
    .text(text, { paragraphGap: 4 });
  doc
    .moveTo(72, doc.y + 4)
    .lineTo(72 + PW, doc.y + 4)
    .strokeColor(C.teal)
    .lineWidth(2)
    .stroke();
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(11).fillColor(C.black);
}

function h2(text) {
  doc
    .moveDown(0.8)
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(C.teal)
    .text(text, { paragraphGap: 2 });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(11).fillColor(C.black);
}

function h3(text) {
  doc
    .moveDown(0.6)
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(C.slate)
    .text(text, { paragraphGap: 2 });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(11).fillColor(C.black);
}

function para(text) {
  doc.font("Helvetica").fontSize(11).fillColor(C.black).text(text, { lineGap: 3, paragraphGap: 4 });
  doc.moveDown(0.3);
}

function bullet(items, indent = 10) {
  doc.font("Helvetica").fontSize(11).fillColor(C.black);
  for (const item of items) {
    doc.text("\u2022 " + item, 72 + indent, doc.y, { width: PW - indent, lineGap: 2, paragraphGap: 3 });
  }
  doc.moveDown(0.4);
}

function numberedList(items, indent = 10) {
  doc.font("Helvetica").fontSize(11).fillColor(C.black);
  items.forEach((item, i) => {
    doc.text(`${i + 1}. ${item}`, 72 + indent, doc.y, { width: PW - indent, lineGap: 2, paragraphGap: 3 });
  });
  doc.moveDown(0.4);
}

function infoBox(text, bgColor = "#e0f2fe", borderColor = C.teal) {
  const boxY = doc.y;
  const textH = doc.heightOfString(text, { width: PW - 30 });
  doc.rect(72, boxY, PW, textH + 20).fill(bgColor);
  doc.moveTo(72, boxY).lineTo(72, boxY + textH + 20).strokeColor(borderColor).lineWidth(3).stroke();
  doc.fillColor(C.navy).fontSize(11).text(text, 82, boxY + 10, { width: PW - 30, lineGap: 3 });
  doc.y = boxY + textH + 28;
  doc.moveDown(0.3);
}

function table(headers, rows) {
  const colCount = headers.length;
  const colW = PW / colCount;
  const cellPad = 6;
  const headerH = 22;

  // Capture y BEFORE drawing the header rect.
  // PDFKit shape drawing (.rect/.fill) does NOT update doc.y, so we must
  // track positions manually throughout this function.
  const headerY = doc.y;
  doc.rect(72, headerY, PW, headerH).fill(C.navy);
  headers.forEach((h, i) => {
    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(h, 72 + i * colW + cellPad, headerY + 5, {
        width: colW - cellPad * 2,
        lineBreak: false,
      });
  });
  // Force the cursor to start immediately below the header rect,
  // regardless of where doc.y drifted during the header text calls.
  let rowY = headerY + headerH;

  rows.forEach((row, ri) => {
    const rowH = Math.max(
      ...row.map((cell) => doc.heightOfString(String(cell), { width: colW - cellPad * 2 }))
    ) + cellPad * 2;

    if (rowY + rowH > doc.page.height - 90) {
      addPage();
      rowY = doc.y;
    }

    doc.rect(72, rowY, PW, rowH).fill(ri % 2 === 0 ? C.white : C.light);
    row.forEach((cell, ci) => {
      doc
        .fillColor(C.black)
        .font("Helvetica")
        .fontSize(10)
        .text(String(cell), 72 + ci * colW + cellPad, rowY + cellPad, {
          width: colW - cellPad * 2,
          lineGap: 2,
        });
    });

    doc.rect(72, rowY, PW, rowH).strokeColor(C.divider).lineWidth(0.5).stroke();
    // Advance rowY by the actual row height; also sync doc.y so that
    // addPage() / checkPageSpace() see the correct cursor position.
    rowY += rowH;
    doc.y = rowY;
  });

  doc.y = rowY;
  doc.moveDown(0.6);
}

function checkPageSpace(needed = 80) {
  if (doc.y > doc.page.height - 90 - needed) {
    addPage();
  }
}

// ════════════════════════════════════════════════════════════════════
// CONTENT
// ════════════════════════════════════════════════════════════════════

// ── Cover ────────────────────────────────────────────────────────────
coverPage();

// ── Table of Contents ─────────────────────────────────────────────────
addPage();
h1("Table of Contents");

const toc = [
  ["1", "About FinSight Lite", "3"],
  ["2", "Getting Started", "4"],
  ["3", "Student Guide", "5"],
  ["4", "Teacher Guide", "9"],
  ["5", "Organisation Admin Guide", "13"],
  ["6", "Super Admin Guide", "17"],
  ["7", "Glossary", "21"],
];

doc.font("Helvetica").fontSize(11).fillColor(C.black);
toc.forEach(([num, title, pg]) => {
  const y = doc.y;
  doc.text(`${num}.  ${title}`, 72, y, { continued: true });
  doc.fillColor(C.muted).text(` ${"·".repeat(60)} ${pg}`, { align: "right" });
  doc.fillColor(C.black);
  doc.moveDown(0.5);
});

// ════════════════════════════════════════════════════════════════════
// SECTION 1 - ABOUT
// ════════════════════════════════════════════════════════════════════
sectionCover("Section 1", "About FinSight Lite", C.navy);

addPage();
h1("About FinSight Lite");

para(
  "FinSight Lite is a financial literacy web application purpose-built for young learners aged 12–17 across the Caribbean. " +
  "Adapted from its parent platform FinSight 360, the Lite version strips away complexity and wraps core financial concepts " +
  "in a playful, gamified experience - think glassmorphism visuals, Caribbean-themed gradients, XP points, badges, and leaderboards."
);

para(
  "The platform serves four distinct roles, each with its own tailored dashboard and feature set:"
);

table(
  ["Role", "Primary Purpose"],
  [
    ["Student", "Learn, track money, play financial games, and climb leaderboards"],
    ["Teacher", "Manage classes, set challenges, upload exam content, and monitor progress"],
    ["Org Admin", "Oversee multiple schools, manage AI quotas, and view organisation analytics"],
    ["Super Admin", "Run the entire platform - users, schools, sponsors, and system health"],
  ]
);

h2("Design Philosophy");
bullet([
  "Caribbean-first: currencies (BSD, JMD, TTD, BBD, GYD, XCD), cultural context, and relatable scenarios",
  "Gamified learning: XP, levels, badges, and leaderboards keep students intrinsically motivated",
  "Safe simulation: virtual balances let students practise investing without real financial risk",
  "AI-assisted: a friendly Money Guide AI mentor answers questions and gives personalised tips",
  "Multi-tenant: each organisation operates in its own sandboxed environment",
]);

h2("Supported Browsers & Devices");
bullet([
  "Chrome 110+, Firefox 110+, Safari 16+, Edge 110+ (desktop & mobile)",
  "iOS 15+ and Android 10+ via mobile browser",
  "Minimum recommended screen width: 375 px",
]);

infoBox("FinSight Lite is a web application - no app store download is required. Simply open a browser and navigate to your school's FinSight Lite URL.");

// ════════════════════════════════════════════════════════════════════
// SECTION 2 - GETTING STARTED
// ════════════════════════════════════════════════════════════════════
sectionCover("Section 2", "Getting Started", C.teal);

addPage();
h1("Getting Started");

h2("Accessing the Platform");
para("Open a modern web browser and navigate to the URL provided by your school or organisation. You will see the FinSight Lite sign-in page.");

h2("Signing In");

h3("Students");
numberedList([
  "Click Sign In and choose Student.",
  "Enter the email address and password set up by your teacher, or use Google Sign-In if your school has enabled it.",
  "First-time users will be prompted to set a new password.",
]);

h3("Teachers");
numberedList([
  "Navigate to /teacher-login or click the Teacher sign-in link on the home page.",
  "Enter your registered email and password.",
  "New teacher accounts are created by an Org Admin or Super Admin.",
  "Google Sign-In is available if configured by your organisation.",
]);

h3("Org Admins & Super Admins");
numberedList([
  "Navigate to /admin-login.",
  "Enter your credentials. Accounts are provisioned by Super Admins only.",
  "Multi-factor authentication may be required depending on your organisation's policy.",
]);

h2("Forgotten Password");
bullet([
  "Click Forgot password? on the sign-in page.",
  "Enter your registered email address.",
  "Check your inbox for a reset link (valid for 1 hour).",
  "If no email arrives within 5 minutes, check your spam folder or contact your teacher/admin.",
]);

h2("Signing Out");
para("Click the Log Out button at the bottom of the sidebar. For shared devices, always sign out before leaving.");

h2("Navigation Sidebar");
para(
  "The left sidebar is your primary navigation. On a desktop it can be expanded (full labels) or collapsed to a slim icon rail - " +
  "click the chevron arrow at the top of the sidebar to toggle. On mobile, tap the hamburger icon (☰) in the top-left corner."
);
para("Navigation items are grouped into three sections:");
table(
  ["Section", "Items"],
  [
    ["My Finances", "My Money · Budgets · Savings Goals"],
    ["Investing & Learning", "Investment Simulator · Lessons · MoneyLab"],
    ["Explore", "Money Games · Money Guide"],
  ]
);
para("Settings appears below all groups. The icon rail (collapsed state) shows icons only - hover over any icon to see its label.");

h2("Appearance (Light & Dark Mode)");
para(
  "You can switch between light and dark mode at any time. Open Settings from the bottom of the sidebar " +
  "and toggle the switch in the Appearance card at the top of the page."
);

// ════════════════════════════════════════════════════════════════════
// SECTION 3 - STUDENT GUIDE
// ════════════════════════════════════════════════════════════════════
sectionCover("Section 3", "Student Guide", "#0369a1");

addPage();
h1("Student Guide");

para(
  "The student experience is the heart of FinSight Lite. Everything is designed to make learning about money fun, " +
  "competitive, and practical. Your personal dashboard is the starting point for all activities."
);

h2("Dashboard Overview");
bullet([
  "Balance Summary - your current virtual wallet balance and real-world tracked balance side-by-side",
  "XP & Level - your current experience points, level badge, and progress to the next level",
  "Active Goals - savings goals you have created and their completion percentage",
  "Recent Activity - the last five transactions or quiz results",
  "Class Leaderboard - where you rank among your classmates this week",
]);

infoBox(
  "Navigation tip: Use the sidebar on the left to move between sections. " +
  "The sidebar is split into three groups - My Finances, Investing & Learning, and Explore. " +
  "Click the arrow at the top to collapse it to a compact icon rail if you need more screen space."
);

checkPageSpace(120);
h2("Money Manager");

h3("Tracking Income");
para("Use the Money Manager to log real-world income such as allowance, birthday gifts, or earnings from chores.");
numberedList([
  "Click + Add Transaction on the Money Manager page.",
  "Select Income as the type.",
  "Enter the amount and choose your currency (BSD, JMD, TTD, etc.).",
  "Add a description (e.g., 'Weekly allowance') and the date.",
  "Click Save - the transaction appears in your ledger and updates your balance.",
]);

h3("Tracking Expenses");
para("Log spending to understand where your money goes.");
numberedList([
  "Click + Add Transaction and select Expense.",
  "Choose a category: Food, Transport, Entertainment, Education, Savings, or Other.",
  "Enter the amount, description, and date.",
  "Click Save.",
]);

h3("Currency Support");
table(
  ["Code", "Country / Territory"],
  [
    ["BSD", "Bahamas"],
    ["JMD", "Jamaica"],
    ["TTD", "Trinidad & Tobago"],
    ["BBD", "Barbados"],
    ["GYD", "Guyana"],
    ["XCD", "Eastern Caribbean (Antigua, Grenada, St. Lucia, etc.)"],
  ]
);

checkPageSpace(100);
h2("Savings Goals");

para("Setting a savings goal keeps you focused and makes progress visible.");
numberedList([
  "Go to Goals and click + New Goal.",
  "Name your goal (e.g., 'New Sneakers') and set a target amount.",
  "Choose a target date (optional).",
  "Click Create. The goal card appears on your dashboard.",
  "Each time you add a savings transaction, you can link it to a goal to track progress.",
]);

bullet([
  "Goals turn amber when you are within 25 % of the target amount",
  "Goals turn green and award XP when you reach 100 %",
  "Completed goals earn a special Goal Achieved badge",
]);

checkPageSpace(160);
h2("Investment Simulator");

para(
  "The Investment Simulator is a safe, risk-free tool where you practise buying and selling stocks and bonds " +
  "using a virtual balance. No real money is ever involved. Find it under Investing & Learning in the sidebar."
);

h3("Starting Balance");
para("Every student begins with a virtual starting balance assigned by their teacher (typically $1,000 in the local currency equivalent).");

h3("Buying Assets");
numberedList([
  "Open Money Lab and browse the available Stocks and Bonds.",
  "Click on any asset to see its current simulated price and historical chart.",
  "Enter the number of units you want to buy and click Buy.",
  "Your virtual balance decreases and the asset appears in your Portfolio.",
]);

h3("Selling Assets");
numberedList([
  "Go to your Portfolio and click on an asset you own.",
  "Click Sell, enter the number of units, and confirm.",
  "Your virtual balance increases by the sale value.",
  "Your profit or loss is shown immediately.",
]);

infoBox("Prices in Money Lab are simulated and updated periodically. They reflect realistic market behaviour but are not real stock prices. Treat Money Lab as a learning tool, not financial advice.");

checkPageSpace(100);
h2("MoneyLab (Exam Games & AI Tutor)");

para(
  "MoneyLab is your exam preparation hub - found under Investing & Learning in the sidebar. " +
  "It has four areas: Upload Past Paper, Play Exam Game, AI Tutor, and Leaderboards."
);

h3("Playing a Quiz");
numberedList([
  "Navigate to MoneyLab from the Investing & Learning section in the sidebar.",
  "Click Play Exam Game and select an available paper.",
  "Choose a game mode: Quiz (relaxed), Timed Exam (30 s per question), or Challenge Mode (speed bonus).",
  "Answer each multiple-choice question - correct answers earn XP.",
  "Your score, accuracy, and XP earned are shown on the results screen.",
]);

h3("XP & Levelling");
table(
  ["Action", "XP Earned"],
  [
    ["Complete a quiz", "10–50 XP (based on score)"],
    ["Perfect quiz score", "+20 bonus XP"],
    ["Reach a savings goal", "30 XP"],
    ["First transaction logged", "5 XP"],
    ["First Money Lab trade", "10 XP"],
    ["Daily login", "2 XP"],
  ]
);

checkPageSpace(100);
h2("Money Guide (AI Mentor)");

para(
  "Money Guide is your personal AI-powered financial mentor. Ask it anything about saving, budgeting, " +
  "investing, or the Caribbean economy. Find it in the Explore section of the sidebar."
);

h3("Starting a Conversation");
numberedList([
  "Click Money Guide in the Explore section of the sidebar.",
  "Type your question in the chat box and press Enter or click Send.",
  "The AI responds in plain language with practical tips tailored to the Caribbean context.",
]);

bullet([
  "Example: 'How do I start saving for a phone?'",
  "Example: 'What is the difference between a stock and a bond?'",
  "Example: 'How much interest would I earn if I save $50 a month for a year?'",
]);

infoBox("Money Guide conversations count against your organisation's daily AI usage quota. Your teacher or Org Admin manages these limits. If you see a 'Daily limit reached' message, try again the next day.");

checkPageSpace(80);
h2("Leaderboards");

para("Compete with classmates and students across your school or country. The MoneyLab Leaderboard is inside MoneyLab → Leaderboards.");

bullet([
  "Class Leaderboard - ranked by total XP this week among your classmates",
  "School Leaderboard - your rank among all students at your school",
  "National Leaderboard - top performers from all participating schools",
  "MoneyLab Leaderboard - ranked by total quiz score (inside MoneyLab > Leaderboards)",
]);

h2("Badges & Achievements");

table(
  ["Badge", "How to Earn It"],
  [
    ["First Save", "Log your first savings transaction"],
    ["Goal Getter", "Complete your first savings goal"],
    ["Quiz Ace", "Score 100% on any quiz"],
    ["Investor", "Make your first Money Lab trade"],
    ["Big Spender (ironic)", "Log 20 or more expense transactions"],
    ["Top of the Class", "Finish #1 on the weekly class leaderboard"],
    ["Money Master", "Reach Level 10"],
  ]
);

// ════════════════════════════════════════════════════════════════════
// SECTION 4 - TEACHER GUIDE
// ════════════════════════════════════════════════════════════════════
sectionCover("Section 4", "Teacher Guide", C.teal);

addPage();
h1("Teacher Guide");

para(
  "Teachers are the facilitators on FinSight Lite. You create the learning environment, guide students through the curriculum, " +
  "set challenges, and monitor progress - all from your dedicated Teacher Dashboard."
);

h2("Teacher Dashboard Overview");
bullet([
  "My Classes - all classes you manage with enrolment counts and recent activity",
  "Average Class Score - mean quiz score across all your classes this week",
  "Lesson Completion Rate - percentage of students who have engaged with each lesson",
  "Upcoming Challenges - financial challenges you have scheduled",
  "Recent Student Activity - live feed of notable student actions (new goals, quiz completions, trades)",
]);

checkPageSpace(160);
h2("Managing Classes");

h3("Creating a Class");
numberedList([
  "Click + New Class on the Classes page.",
  "Enter the class name (e.g., 'Form 4A – Economics') and academic year.",
  "Select the grade level and primary currency for the class.",
  "Click Create. A unique class code is generated automatically.",
]);

h3("Sharing the Class Code");
para("Distribute the class code to your students. They enter it when signing up or in their profile settings to enrol in your class. Codes are alphanumeric (e.g., FSL-4A28) and do not expire unless you reset them.");

h3("Resetting a Class Code");
bullet([
  "Open the class settings and click Reset Code.",
  "The old code is immediately invalidated - students who have not yet enrolled must use the new code.",
  "Students already enrolled are unaffected.",
]);

h3("Removing a Student");
numberedList([
  "Open the class roster.",
  "Find the student, click the three-dot menu (⋯), and select Remove from Class.",
  "Confirm the action. The student's data is retained but they are no longer associated with your class.",
]);

checkPageSpace(160);
h2("Financial Challenges");

para(
  "Challenges are time-limited goals you set for your class - for example, 'Save at least $200 in the simulator by Friday'. " +
  "They have a dedicated leaderboard to encourage friendly competition."
);

h3("Creating a Challenge");
numberedList([
  "Go to Challenges and click + New Challenge.",
  "Enter a title, description, and the metric (e.g., Savings Goal Completion, Portfolio Value, Quiz Score).",
  "Set start and end dates.",
  "Select which classes the challenge applies to.",
  "Click Publish. Students see the challenge immediately in their dashboard.",
]);

h3("Monitoring a Challenge");
bullet([
  "The Challenge Detail page shows a live leaderboard updated in near-real-time",
  "You can send a class announcement encouraging stragglers",
  "Challenges automatically close at the end date; final rankings are frozen",
]);

checkPageSpace(120);
h2("MoneyLab - Uploading Past Papers");

para(
  "Teachers can upload past exam papers directly from the MoneyLab section (Investing & Learning > MoneyLab > Upload Past Paper). " +
  "FinSight Lite uses AI to extract questions and turn them into playable quiz games."
);

numberedList([
  "Navigate to MoneyLab from the Investing & Learning section in the sidebar.",
  "Click Upload Past Paper.",
  "Drag-and-drop or browse for a PDF or image file (PDF, JPG, or PNG - max 10 MB).",
  "Give the paper an optional title and select the subject.",
  "Click the upload zone. The AI extracts questions and creates a quiz - this usually takes 30–120 seconds.",
  "The paper appears in Your Uploaded Papers once processing is complete.",
  "Students can then select it in Play Exam Game.",
]);

infoBox("Uploaded exam papers are private to your class. Questions generated by AI should always be reviewed before publishing to ensure accuracy.");

checkPageSpace(120);
h2("Progress Tracking");

h3("Class Report");
para("The Class Report page shows aggregate metrics for each class:");
bullet([
  "Average XP earned this week",
  "Mean quiz score across all published quizzes",
  "Savings goal completion rate",
  "Money Lab engagement (number of students who have made at least one trade)",
  "AI Guide usage vs. class quota",
]);

h3("Individual Student Report");
para("Click any student's name in the roster to open their individual profile:");
bullet([
  "Transaction history (income, expenses, savings)",
  "All active and completed goals",
  "Quiz attempt history with scores",
  "Portfolio snapshot (current holdings and total value)",
  "Badge collection and XP timeline",
]);

h3("Downloading Reports");
bullet([
  "Class summary: CSV or PDF - click Download Report on the class dashboard",
  "Individual report: PDF - click Download on the student's profile page",
]);

checkPageSpace(80);
h2("Communication");

h3("Sending an Announcement");
numberedList([
  "Go to Communication and click + New Announcement.",
  "Select the target class (or all your classes).",
  "Type your message (e.g., 'Great work this week! The quiz closes Sunday.').",
  "Click Send. Students see the announcement as a notification banner in their dashboard.",
]);

h3("Certificates");
para("You can award completion certificates to students who finish a challenge or unit:");
numberedList([
  "Open the Challenge or Unit detail page.",
  "Click Issue Certificates.",
  "Select eligible students (those who met the completion criteria).",
  "Click Send Certificates. Each student receives a personalised PDF certificate by email.",
]);

// ════════════════════════════════════════════════════════════════════
// SECTION 5 - ORG ADMIN GUIDE
// ════════════════════════════════════════════════════════════════════
sectionCover("Section 5", "Organisation Admin Guide", C.amber);

addPage();
h1("Organisation Admin Guide");

para(
  "Org Admins manage the operational layer of FinSight Lite for a school, district, or regional body. " +
  "You oversee multiple environments (schools), control AI resource allocation, and track organisation-wide analytics."
);

h2("Org Admin Dashboard Overview");
bullet([
  "Environment Summary - total students, teachers, and active classes across all managed schools",
  "AI Usage Widget - current vs. allowed daily AI calls organisation-wide",
  "Email Deliverability - open and delivery rates for weekly digest emails",
  "Recent Enrolment Activity - new students and teacher registrations in the past 7 days",
  "Published Lessons - count of lessons published across all environments",
]);

checkPageSpace(160);
h2("Managing Environments");

para("An Environment in FinSight Lite corresponds to a school or branch. Each environment is isolated - students and teachers in one environment cannot see data from another.");

h3("Viewing Environments");
bullet([
  "Navigate to Environments from the sidebar.",
  "Each card shows the environment name, number of teachers, number of students, and status (Active / Suspended).",
]);

h3("Creating an Environment");
numberedList([
  "Click + New Environment.",
  "Enter the school name, primary contact email, and preferred currency.",
  "Click Create. The environment is immediately active.",
  "Share the new Teacher Sign-Up URL with the school's lead teacher.",
]);

h3("Suspending an Environment");
bullet([
  "Open the environment settings and toggle the status to Suspended.",
  "Suspended environments retain all data but no users can log in.",
  "Re-activate by toggling back to Active.",
]);

checkPageSpace(140);
h2("AI Quota Management");

para(
  "Every organisation has a configurable daily AI call quota shared across all students' Money Guide conversations. " +
  "Org Admins can adjust limits per environment or for the organisation as a whole."
);

h3("Viewing Current Usage");
bullet([
  "The AI Usage widget on the dashboard shows calls used today vs. the daily limit",
  "Click See Details to see a per-environment breakdown",
  "Usage resets at midnight (UTC) each day",
]);

h3("Adjusting Quotas");
numberedList([
  "Navigate to Settings > AI Quotas.",
  "Enter a new daily limit in the Org-Wide Limit field (e.g., 500 calls/day).",
  "Optionally set per-environment overrides by clicking the environment name.",
  "Click Save. The new limit takes effect immediately.",
]);

infoBox("Reducing the quota below today's usage does not cut off active conversations mid-session, but new sessions will be blocked until the next reset.");

checkPageSpace(160);
h2("Analytics");

h3("Enrolment Trends");
para("The Enrolment chart shows weekly new student sign-ups across all environments. Use this to identify environments with low adoption and follow up with the relevant school.");

h3("Lesson Engagement");
para("The Lesson Engagement panel shows the percentage of enrolled students who have interacted with at least one lesson in the past 30 days.");

h3("Email Reports");
bullet([
  "Weekly digest emails are sent to teachers every Monday morning",
  "The Email Deliverability widget shows delivery rate, open rate, and bounce rate",
  "Click View Bounced Addresses to see which emails failed and take corrective action",
]);

h3("Exporting Data");
bullet([
  "Navigate to Analytics > Export.",
  "Select the date range, environment(s), and data type (Enrolment, AI Usage, Lesson Engagement).",
  "Click Export CSV. The file downloads immediately.",
]);

checkPageSpace(120);
h2("User Oversight");

h3("Viewing All Teachers");
bullet([
  "Navigate to Users > Teachers.",
  "Filter by environment, registration date, or activity status.",
  "Click a teacher's name to see their classes, student count, and last login date.",
]);

h3("Resetting a Teacher Password");
numberedList([
  "Open the teacher's profile.",
  "Click Reset Password.",
  "An automated reset email is sent to the teacher's registered address.",
]);

h3("Deactivating a User");
bullet([
  "Open the user's profile and click Deactivate Account.",
  "Deactivated users cannot log in. Their data is fully retained.",
  "Reactivate at any time from the same profile page.",
]);

h2("Google Sign-In Domain Restrictions");

para("If your organisation uses Google Sign-In for students, you can restrict sign-ins to specific email domains (e.g., only @school.edu.jm).");

numberedList([
  "Go to Settings > Authentication.",
  "Toggle Allow Google Sign-In to On.",
  "Under Allowed Domains, enter each domain on a new line.",
  "Click Save. Students using Google accounts outside these domains will be blocked.",
]);

// ════════════════════════════════════════════════════════════════════
// SECTION 6 - SUPER ADMIN GUIDE
// ════════════════════════════════════════════════════════════════════
sectionCover("Section 6", "Super Admin Guide", C.navy);

addPage();
h1("Super Admin Guide");

para(
  "The Super Admin role has unrestricted access to every part of FinSight Lite. " +
  "This role is reserved for platform operators and is never assigned to school staff."
);

h2("Global Dashboard");

bullet([
  "Total Organisations - number of active organisations on the platform",
  "Total Schools - aggregate school count across all organisations",
  "Total Teachers - platform-wide teacher count",
  "Total Students - platform-wide enrolled student count",
  "Total Sponsors - number of active sponsorship entities",
  "System Health - uptime indicator and latest healthcheck timestamp",
]);

checkPageSpace(160);
h2("Managing Organisations");

h3("Creating an Organisation");
numberedList([
  "Navigate to Organisations and click + New Organisation.",
  "Enter the organisation name, billing contact email, and country.",
  "Set the initial AI quota (daily call limit).",
  "Click Create. The organisation is active immediately.",
  "Create at least one Org Admin account for the organisation using the Users panel.",
]);

h3("Editing an Organisation");
bullet([
  "Click the organisation name to open its detail page.",
  "Edit name, contact, country, or quota fields inline.",
  "Click Save Changes.",
]);

h3("Suspending / Deleting an Organisation");
bullet([
  "Suspending disables all logins for all users in the organisation (reversible).",
  "Deleting permanently removes all data - this action cannot be undone. A double-confirmation prompt is shown.",
  "Best practice: always suspend first and wait 30 days before deleting.",
]);

checkPageSpace(120);
h2("Managing Schools, Teachers & Students");

para("The master data panel gives you full CRUD access across all entities. Navigate using the left sidebar: Schools, Teachers, Students.");

table(
  ["Entity", "Create", "Edit", "Deactivate", "Delete"],
  [
    ["Schools", "Yes", "Yes", "Yes", "Yes (with org confirmation)"],
    ["Teachers", "Yes", "Yes", "Yes", "Yes"],
    ["Students", "No (self-register)", "Yes (profile only)", "Yes", "Yes"],
    ["Sponsors", "Yes", "Yes", "Yes", "Yes"],
  ]
);

checkPageSpace(120);
h2("Sponsors");

para("Sponsors are corporate or non-profit partners who sponsor challenges, leaderboards, or the platform itself. Sponsor logos can appear on student-facing leaderboards and certificates.");

numberedList([
  "Navigate to Sponsors and click + New Sponsor.",
  "Enter sponsor name, logo URL, website, and partnership tier (Bronze / Silver / Gold / Platinum).",
  "Toggle Active to make the sponsor visible on the platform.",
  "Click Save.",
]);

checkPageSpace(160);
h2("Audit Log");

para(
  "Every significant action on the platform - user creation, quota changes, data deletions, certificate issuance - " +
  "is recorded in the Audit Log. This log is immutable and retained for 12 months."
);

h3("Reading the Audit Log");
table(
  ["Column", "Description"],
  [
    ["Timestamp", "Date and time (UTC) the action occurred"],
    ["Actor", "Email of the user who performed the action"],
    ["Role", "Role of the actor (Super Admin, Org Admin, Teacher, System)"],
    ["Action", "Short description of the action (e.g., 'Created organisation')"],
    ["Target", "The entity affected (e.g., organisation name or user ID)"],
    ["Details", "JSON payload with before/after values for edits"],
  ]
);

h3("Filtering the Audit Log");
bullet([
  "Filter by actor email, role, action type, or date range",
  "Export filtered results as CSV for compliance reporting",
]);

checkPageSpace(120);
h2("DB Viewer");

para(
  "The DB Viewer is a read-only spreadsheet-like interface that lets you explore and filter any database table " +
  "without writing SQL. It is intended for non-technical administrators who need to look up records quickly."
);

bullet([
  "Select a table from the dropdown (e.g., users, classes, transactions)",
  "Use the column filters to narrow results",
  "Click any row to see the full record",
  "Export the current filtered view as CSV",
]);

infoBox("The DB Viewer is strictly read-only. No edits are possible from this interface. For data corrections, use the appropriate management page.");

checkPageSpace(120);
h2("Background Jobs");

para("Long-running tasks (bulk imports, email dispatches, certificate generation) run as background jobs. You can monitor them from the Admin Dashboard.");

table(
  ["Status", "Meaning"],
  [
    ["Queued", "Job is waiting to be picked up by a worker"],
    ["Running", "Job is actively being processed"],
    ["Completed", "Job finished successfully"],
    ["Failed", "Job encountered an error - see the error message for details"],
  ]
);

bullet([
  "Jobs are automatically cleaned up after 30 days to keep the queue table small",
  "Failed jobs can be retried from the job detail page",
  "Email a Super Admin alert is triggered if a job fails more than 3 times consecutively",
]);

checkPageSpace(120);
h2("Global Search");

para("The Global Search bar (keyboard shortcut: Cmd/Ctrl + K) lets you find any record on the platform instantly:");
bullet([
  "Students - search by name, email, or student ID",
  "Teachers - search by name or email",
  "Schools - search by name or location",
  "Organisations - search by name or billing email",
  "Click any result to jump directly to that record's detail page",
]);

checkPageSpace(120);
h2("System Health");

bullet([
  "The /healthz endpoint is checked every minute by the uptime worker",
  "The System Health widget on the global dashboard shows current status (green / red)",
  "If the health check fails 3 consecutive times, an alert email is sent to the configured ALERT_EMAIL address",
  "View uptime history for the past 30 days in the System > Health page",
]);

// ════════════════════════════════════════════════════════════════════
// SECTION 7 - GLOSSARY
// ════════════════════════════════════════════════════════════════════
sectionCover("Section 7", "Glossary", C.slate);

addPage();
h1("Glossary");

const glossary = [
  ["Asset", "Anything of value that can earn a return - in Money Lab this includes simulated stocks and bonds."],
  ["Badge", "A digital award earned for completing a specific action or reaching a milestone on the platform."],
  ["Bond", "A simulated fixed-income investment in Money Lab. Bonds typically have lower risk and lower return than stocks."],
  ["BSD", "Bahamian Dollar - the currency of the Bahamas."],
  ["Challenge", "A time-limited competition set by a teacher with a specific metric (savings, quiz score, portfolio value)."],
  ["Class Code", "A unique alphanumeric code generated for each class. Students enter it to join the class."],
  ["Daily AI Quota", "The maximum number of Money Guide AI conversations allowed per day, set by the Org Admin."],
  ["DB Viewer", "A read-only database browsing tool available to Super Admins."],
  ["Environment", "A sandboxed instance of FinSight Lite corresponding to a school or branch within an organisation."],
  ["Expense", "A transaction representing money spent."],
  ["GYD", "Guyanese Dollar - the currency of Guyana."],
  ["Healthcheck", "An automated ping to /healthz that verifies the server is running correctly."],
  ["Income", "A transaction representing money received (allowance, gift, earnings)."],
  ["JMD", "Jamaican Dollar - the currency of Jamaica."],
  ["Leaderboard", "A ranked list of students or schools based on XP, quiz scores, or portfolio value."],
  ["Level", "A progression tier that increases as students accumulate XP (Level 1 → Level 10+)."],
  ["Money Guide", "The AI-powered financial mentor chatbot available to students."],
  ["Money Lab", "The investment simulator where students buy and sell virtual stocks and bonds."],
  ["MoneyLab Games", "Quiz games generated from teacher-uploaded past exam papers."],
  ["Org Admin", "An Organisation Administrator who oversees one or more school environments."],
  ["Organisation", "The top-level entity in FinSight Lite, typically a school district, regional body, or NGO."],
  ["Past Paper", "A previously published exam paper uploaded by a teacher to generate quiz content."],
  ["Portfolio", "The collection of virtual assets (stocks, bonds) held by a student in Money Lab."],
  ["Savings Goal", "A target amount a student aims to save by a chosen date."],
  ["Sponsor", "A corporate or non-profit partner whose branding may appear on leaderboards and certificates."],
  ["Stock", "A simulated equity investment in Money Lab. Stocks carry higher risk and potential return than bonds."],
  ["Super Admin", "The platform operator role with full unrestricted access to all platform data and settings."],
  ["TTD", "Trinidad and Tobago Dollar - the currency of Trinidad and Tobago."],
  ["Virtual Balance", "The simulated money a student uses in Money Lab - not real currency."],
  ["XCD", "Eastern Caribbean Dollar - used across Antigua, Grenada, St. Lucia, and other OECS nations."],
  ["XP (Experience Points)", "Points earned by students for completing activities. XP drives level progression."],
];

// Render glossary as alternating rows
glossary.forEach(([term, definition], i) => {
  checkPageSpace(40);
  const y = doc.y;
  const defH = doc.heightOfString(definition, { width: PW * 0.7 - 10 }) + 10;
  const rowH = Math.max(defH, 22);

  doc.rect(72, y, PW, rowH).fill(i % 2 === 0 ? C.white : C.light);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(C.navy)
    .text(term, 74, y + 5, { width: PW * 0.28, lineGap: 1 });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(C.black)
    .text(definition, 72 + PW * 0.3, y + 5, { width: PW * 0.7 - 4, lineGap: 2 });

  doc.rect(72, y, PW, rowH).strokeColor(C.divider).lineWidth(0.5).stroke();
  doc.y = y + rowH;
});

doc.moveDown(1);
infoBox("For support or to report a bug, contact your Org Admin or reach the FinSight team at support@finsightlite.com.");

// ─── Finalise ───────────────────────────────────────────────────────────────
doc.end();

stream.on("finish", () => {
  console.log(`✅  PDF written to ${OUT_FILE}`);
});
stream.on("error", (err) => {
  console.error("❌  Error writing PDF:", err.message);
  process.exit(1);
});
