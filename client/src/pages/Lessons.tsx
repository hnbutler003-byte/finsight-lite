import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, CheckCircle2, XCircle, Trophy,
  Star, Award, Loader2, ChevronRight, Clock, GraduationCap,
  Target, ListChecks, BookMarked, KeyRound, PiggyBank,
  TrendingUp, Wallet, Lightbulb, ShoppingCart, BarChart3,
  Layers, ChevronDown, ChevronUp, Play, Lock, Download, Video
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { jsPDF } from "jspdf";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import faLogoUrl from "@assets/The_Financial_Academy_1776381894734.webp";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentSection = { heading: string; body: string; examples?: string[] };
type QuizQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  order_index: number;
};
type Lesson = {
  id: string;
  org_id: string;
  org_name?: string | null;
  org_logo_url?: string | null;
  org_signature_left_name?: string | null;
  org_signature_left_role?: string | null;
  org_signature_right_name?: string | null;
  org_signature_right_role?: string | null;
  title: string;
  instructor?: string;
  subject?: string;
  grade_level?: string;
  topic?: string;
  duration?: string;
  video_url?: string | null;
  objectives: string[];
  content_sections: ContentSection[];
  is_published: boolean;
  created_at: string;
};

type FinancialAcademyBranding = {
  logoUrl?: string | null;
  leftName?: string | null;
  leftRole?: string | null;
  rightName?: string | null;
  rightRole?: string | null;
};

const FINANCIAL_ACADEMY_NAME = "The Financial Academy";

function isFinancialAcademyLesson(lesson: Lesson | null): boolean {
  if (!lesson) return false;
  if (lesson.org_id?.startsWith("static")) return false;
  const name = lesson.org_name?.trim().toLowerCase();
  return name === FINANCIAL_ACADEMY_NAME.toLowerCase();
}

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
type LessonWithQuestions = Lesson & { questions: QuizQuestion[]; isStatic?: boolean };

type PageState = "list" | "reading" | "quiz" | "results";

const OPTIONS: ("option_a" | "option_b" | "option_c" | "option_d")[] = ["option_a", "option_b", "option_c", "option_d"];
const LETTERS = ["A", "B", "C", "D"];

// ─── OECD-Aligned Static Modules ─────────────────────────────────────────────

type StaticLesson = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  videoUrl?: string;
  objectives: string[];
  content_sections: ContentSection[];
  questions: QuizQuestion[];
};

type StaticModule = {
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  icon: React.ReactNode;
  colorFrom: string;
  colorTo: string;
  textColor: string;
  bgMuted: string;
  borderColor: string;
  lessons: StaticLesson[];
};

const STATIC_MODULES: StaticModule[] = [
  {
    id: "budgeting",
    title: "Budgeting Basics",
    subtitle: "Plan & Manage Money",
    objective: "Students will learn how to plan and manage their money by distinguishing needs from wants, building simple budgets, and tracking their spending.",
    icon: <Wallet className="w-6 h-6" />,
    colorFrom: "from-amber-500",
    colorTo: "to-orange-500",
    textColor: "text-amber-400",
    bgMuted: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    lessons: [
      {
        id: "static-budget-1",
        title: "Needs vs Wants",
        description: "Learn the critical difference between things you must have and things you'd like to have.",
        icon: <ShoppingCart className="w-5 h-5" />,
        duration: "10 min",
        objectives: [
          "Distinguish between needs (food, shelter, clothing) and wants (entertainment, luxuries).",
          "Explain why prioritizing needs leads to better financial decisions.",
          "Give real-life examples of needs vs wants relevant to Caribbean teens.",
        ],
        content_sections: [
          {
            heading: "What Are Needs?",
            body: "Needs are things you must have to survive and function in daily life. These include food, clothing, shelter, healthcare, and transportation to work or school. Without meeting your needs, your health and wellbeing would be at serious risk. In The Bahamas and across the Caribbean, a 'need' for a student might be school supplies, bus fare, or meals — things without which you can't properly participate in daily life.",
            examples: ["Food & clean water", "Rent or housing", "School supplies", "Medical care", "Basic clothing", "Transport to school"],
          },
          {
            heading: "What Are Wants?",
            body: "Wants are things you would like to have but don't need to survive. They make life more enjoyable and comfortable but aren't essential. The latest smartphone, dining at a restaurant, a new gaming console, or designer sneakers are all wants. There is nothing wrong with having wants — the key is knowing they come after your needs are covered.",
            examples: ["New sneakers", "Streaming services", "Video games", "Eating out", "Brand-name clothing", "Latest phone"],
          },
          {
            heading: "Why This Matters for Budgeting",
            body: "Understanding the difference between needs and wants is the foundation of smart budgeting. When you separate your expenses into these two categories, you can make sure your needs are covered first, then decide how to spend what remains on wants. This prevents overspending on things you desire while struggling to pay for things you truly need. Many financial problems happen simply because people confuse the two.",
            examples: ["Pay rent before streaming", "Buy groceries before dining out", "Cover transport before new clothes"],
          },
        ],
        questions: [
          { id: "q-b1-1", order_index: 1, question: "Which of the following is a NEED?", option_a: "Video games", option_b: "Groceries and food", option_c: "Designer sneakers", option_d: "Movie tickets", correct_answer: "B" },
          { id: "q-b1-2", order_index: 2, question: "Which of the following is a WANT?", option_a: "Rent for your home", option_b: "Medicine when you are sick", option_c: "A new pair of name-brand sneakers", option_d: "Bus fare to school", correct_answer: "C" },
          { id: "q-b1-3", order_index: 3, question: "Why should you prioritize needs over wants in a budget?", option_a: "Wants are always more expensive", option_b: "Needs are required for survival and wellbeing", option_c: "Wants are always free", option_d: "Needs are less important than wants", correct_answer: "B" },
          { id: "q-b1-4", order_index: 4, question: "You have $50 left this week. What should come first?", option_a: "Buying a new video game", option_b: "Going to the movies with friends", option_c: "Paying for groceries and bus fare", option_d: "Buying a new outfit", correct_answer: "C" },
        ],
      },
      {
        id: "static-budget-2",
        title: "Creating a Simple Budget",
        description: "Build your first monthly budget using the popular 50/30/20 rule.",
        icon: <BarChart3 className="w-5 h-5" />,
        duration: "12 min",
        objectives: [
          "Apply the 50/30/20 budgeting rule to real-life income scenarios.",
          "List all income sources and all monthly expenses accurately.",
          "Create a balanced budget that covers needs, wants, and savings.",
        ],
        content_sections: [
          {
            heading: "The 50/30/20 Rule",
            body: "A simple and powerful budgeting framework: allocate 50% of your income to needs, 30% to wants, and 20% to savings. For example, if your monthly allowance or earnings are $100, then $50 goes to needs (food, transport), $30 to wants (entertainment, hobbies), and $20 to savings. This rule keeps your finances balanced without needing complex spreadsheets.",
            examples: ["50% needs: food, rent, transport", "30% wants: fun, dining out, clothes", "20% savings: future goals, emergencies"],
          },
          {
            heading: "Step 1 — List Your Income",
            body: "Write down every source of money you receive each month. This includes your allowance, part-time job earnings, gifts, or any side income. Be honest and realistic — only include money you actually receive, not money you hope to get. Your total income is the foundation of your budget.",
            examples: ["Weekly allowance", "Birthday money", "Part-time job", "Selling items", "Babysitting or odd jobs"],
          },
          {
            heading: "Step 2 — List Your Expenses",
            body: "Track everything you spend money on in a typical month. Separate them into needs and wants. Then compare your total expenses to your total income. If your expenses are higher than your income, you need to cut something — usually from wants, never from needs. A good budget is one where income ≥ expenses + savings.",
            examples: ["School fees", "Bus fare", "Lunch money", "Phone credit", "Entertainment"],
          },
        ],
        questions: [
          { id: "q-b2-1", order_index: 1, question: "In the 50/30/20 budgeting rule, what percentage goes to NEEDS?", option_a: "20%", option_b: "30%", option_c: "50%", option_d: "80%", correct_answer: "C" },
          { id: "q-b2-2", order_index: 2, question: "What is the FIRST step in creating a budget?", option_a: "Go shopping for what you need", option_b: "Calculate your total monthly income", option_c: "Open a bank account", option_d: "Ask your parents for money", correct_answer: "B" },
          { id: "q-b2-3", order_index: 3, question: "If you earn $300/month and use the 50/30/20 rule, how much goes to savings?", option_a: "$50", option_b: "$60", option_c: "$90", option_d: "$150", correct_answer: "B" },
          { id: "q-b2-4", order_index: 4, question: "Your expenses are more than your income. What should you cut first?", option_a: "Food and transport", option_b: "School fees", option_c: "Entertainment and dining out", option_d: "Medical expenses", correct_answer: "C" },
        ],
      },
      {
        id: "static-budget-3",
        title: "Tracking Your Spending",
        description: "Discover how monitoring every dollar reveals patterns and helps you stay on budget.",
        icon: <Lightbulb className="w-5 h-5" />,
        duration: "8 min",
        objectives: [
          "Explain why tracking spending is essential to staying within a budget.",
          "Record daily transactions accurately by date, item, and amount.",
          "Review weekly spending to identify areas for improvement.",
        ],
        content_sections: [
          {
            heading: "Why Track Your Spending?",
            body: "When you track where your money goes, you can see if you're sticking to your budget. Many people are surprised to find they spend far more than they thought on small items — a cold drink here, a snack there. These 'micro-expenses' add up fast. Without tracking, it's impossible to know whether you're on budget or slipping into overspending.",
            examples: ["$2 snacks daily = $60/month", "$5 phone credit weekly = $20/month", "Unplanned shopping trips"],
          },
          {
            heading: "How to Track — Simple Methods",
            body: "You don't need fancy apps to track spending. A small notebook works perfectly. After every purchase, write down: the date, what you bought, and how much it cost. Categorize it as a need or want. Review it at the end of the week. Apps like FinSight Lite can automate this for you — simply log each transaction and let the dashboard show your patterns.",
            examples: ["Notebook or journal", "Spreadsheet on phone", "FinSight Lite transactions", "Envelope budgeting method"],
          },
          {
            heading: "Weekly Review — Stay in Control",
            body: "Set aside 10 minutes at the end of each week to review your spending. Ask yourself: Did I stay within my budget? Did I spend on wants before covering needs? Were there any unexpected expenses? This weekly habit builds financial awareness and lets you adjust before small overspending becomes a big problem. It's the habit that separates people who reach financial goals from those who don't.",
          },
        ],
        questions: [
          { id: "q-b3-1", order_index: 1, question: "Why is tracking your spending important?", option_a: "To impress your friends", option_b: "To know if you are sticking to your budget", option_c: "To spend more money", option_d: "Only adults need to track spending", correct_answer: "B" },
          { id: "q-b3-2", order_index: 2, question: "You buy a $2 snack every day. How much do you spend in one month (30 days)?", option_a: "$20", option_b: "$40", option_c: "$60", option_d: "$80", correct_answer: "C" },
          { id: "q-b3-3", order_index: 3, question: "When should you review your spending?", option_a: "Once a year", option_b: "Only when you run out of money", option_c: "Weekly, to catch problems early", option_d: "Never — it causes stress", correct_answer: "C" },
          { id: "q-b3-4", order_index: 4, question: "Which tool can help you track your spending automatically?", option_a: "A dictionary", option_b: "FinSight Lite's transaction log", option_c: "A calculator alone", option_d: "Social media", correct_answer: "B" },
        ],
      },
    ],
  },
  {
    id: "saving",
    title: "Saving Smart",
    subtitle: "Build Your Future",
    objective: "Students will understand why saving is essential, how to set meaningful savings goals, and the strategy of paying yourself first to build lasting financial security.",
    icon: <PiggyBank className="w-6 h-6" />,
    colorFrom: "from-teal-500",
    colorTo: "to-cyan-500",
    textColor: "text-teal-400",
    bgMuted: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
    lessons: [
      {
        id: "static-save-1",
        title: "Why Save Money?",
        description: "Explore why saving is the cornerstone of financial wellbeing and long-term security.",
        icon: <PiggyBank className="w-5 h-5" />,
        duration: "8 min",
        objectives: [
          "Explain at least three reasons why saving money is important.",
          "Describe the concept of an emergency fund and why it matters.",
          "Connect saving habits today to financial freedom in the future.",
        ],
        content_sections: [
          {
            heading: "Saving Creates a Safety Net",
            body: "Life is unpredictable. Cars break down, phones get stolen, people get sick. Without savings, unexpected events force you to borrow money — which often comes with interest and puts you in debt. An emergency fund of even 1–3 months of expenses can protect you from financial crises. In the Caribbean, where hurricanes and natural events can disrupt income, savings are even more critical.",
            examples: ["Phone replacement fund", "Medical emergency buffer", "Hurricane season preparedness", "Job loss cushion"],
          },
          {
            heading: "Saving Builds Financial Freedom",
            body: "Every dollar you save is a dollar that can work for you in the future. When you save consistently, you create options: you can afford education, start a business, travel, or simply live without financial stress. People who save regularly are less likely to need loans for everyday purchases and more likely to achieve big life goals. Financial freedom doesn't happen overnight — it's built one saved dollar at a time.",
            examples: ["University tuition fund", "Business startup money", "House deposit savings", "Retirement fund"],
          },
          {
            heading: "Small Savings Add Up Faster Than You Think",
            body: "You don't need to save large amounts to make a difference. Saving just $5 per week adds up to $260 per year. If you start saving $20 per month at age 13, you'll have $840 by the time you're 17 — without counting any interest earned. The habit of saving is more important than the amount. Start small, start now, and increase as your income grows.",
            examples: ["$5/week = $260/year", "$20/month = $240/year", "$1/day = $365/year"],
          },
        ],
        questions: [
          { id: "q-s1-1", order_index: 1, question: "What is an emergency fund?", option_a: "Money set aside for vacations", option_b: "Savings to cover unexpected expenses or crises", option_c: "Money you invest in stocks", option_d: "A loan from the bank", correct_answer: "B" },
          { id: "q-s1-2", order_index: 2, question: "If you save $5 every week, how much will you have after one year?", option_a: "$100", option_b: "$180", option_c: "$260", option_d: "$360", correct_answer: "C" },
          { id: "q-s1-3", order_index: 3, question: "Why is saving especially important in the Caribbean?", option_a: "Caribbean banks pay higher interest", option_b: "Natural events like hurricanes can disrupt income unexpectedly", option_c: "Caribbean people earn more money", option_d: "It is not especially important there", correct_answer: "B" },
          { id: "q-s1-4", order_index: 4, question: "Which of these is a benefit of saving money?", option_a: "You spend more on wants", option_b: "You go into more debt", option_c: "You create future options and financial freedom", option_d: "You avoid paying taxes", correct_answer: "C" },
        ],
      },
      {
        id: "static-save-2",
        title: "Setting Savings Goals",
        description: "Learn how SMART goals turn vague wishes into achievable financial targets.",
        icon: <Target className="w-5 h-5" />,
        duration: "10 min",
        objectives: [
          "Define a SMART savings goal (Specific, Measurable, Achievable, Relevant, Time-bound).",
          "Distinguish between short-term and long-term savings goals.",
          "Create a personal savings plan with a clear target and timeline.",
        ],
        content_sections: [
          {
            heading: "SMART Goals — Make Saving Purposeful",
            body: "A savings goal without a plan is just a wish. SMART goals transform vague intentions into concrete targets. SMART stands for: Specific (I want to save $300 for a bicycle), Measurable (track progress weekly), Achievable (save $25/month), Relevant (I need transport to school), and Time-bound (in 12 months). When your goal is SMART, you always know exactly how you're doing and when you'll reach it.",
            examples: ["'Save $300 for a bicycle in 12 months'", "'Save $500 for school fees by September'", "'Save $50 emergency fund in 3 months'"],
          },
          {
            heading: "Short-Term vs Long-Term Goals",
            body: "Short-term goals are things you want to achieve within 1–12 months, like saving for a school trip, new shoes, or a phone. Long-term goals take more than a year, like saving for university, a car, or starting a small business. You can work on both types at the same time by splitting your savings: some into your short-term jar, some into your long-term fund. Balancing both builds discipline.",
            examples: ["Short-term: New headphones in 3 months", "Short-term: School trip deposit in 6 months", "Long-term: University fees", "Long-term: Business startup fund"],
          },
          {
            heading: "Breaking Goals Into Weekly Targets",
            body: "Once you have a goal, divide it into weekly or monthly targets. If you want to save $240 in 12 months, that's just $20 per month or $4.60 per week. Seeing it broken down makes it feel achievable. Use FinSight Lite's Savings Goals feature to set your target amount, track your progress, and celebrate milestones as you get closer.",
            examples: ["$240 goal ÷ 12 = $20/month", "$500 goal ÷ 52 = $9.60/week", "Celebrate 25%, 50%, 75% milestones"],
          },
        ],
        questions: [
          { id: "q-s2-1", order_index: 1, question: "What does 'SMART' stand for in goal-setting?", option_a: "Simple, Money, Achievable, Real, Time", option_b: "Specific, Measurable, Achievable, Relevant, Time-bound", option_c: "Savings, Money, Action, Result, Track", option_d: "Smart, Motivated, Aware, Ready, True", correct_answer: "B" },
          { id: "q-s2-2", order_index: 2, question: "Which is a better savings goal?", option_a: "'Save money someday'", option_b: "'Save more next month'", option_c: "'Save $300 for school supplies by August 1st'", option_d: "'Try to spend less'", correct_answer: "C" },
          { id: "q-s2-3", order_index: 3, question: "You want to save $240 in 12 months. How much do you need to save per month?", option_a: "$10", option_b: "$20", option_c: "$30", option_d: "$40", correct_answer: "B" },
          { id: "q-s2-4", order_index: 4, question: "Which of these is a LONG-TERM savings goal?", option_a: "Saving for new headphones this month", option_b: "Saving for a school trip next term", option_c: "Saving for university tuition in 5 years", option_d: "Saving for lunch this week", correct_answer: "C" },
        ],
      },
      {
        id: "static-save-3",
        title: "Pay Yourself First",
        description: "Master the most powerful savings habit: setting aside savings before spending on anything else.",
        icon: <Star className="w-5 h-5" />,
        duration: "8 min",
        objectives: [
          "Understand the 'Pay Yourself First' principle and why it works.",
          "Automate savings by treating them as a fixed, non-negotiable expense.",
          "Explain how this strategy prevents overspending and builds wealth consistently.",
        ],
        content_sections: [
          {
            heading: "What Is 'Pay Yourself First'?",
            body: "Most people spend first and save whatever's left — which is usually nothing. 'Pay Yourself First' flips this: the moment you receive money (allowance, wages, gifts), you immediately move your savings portion aside before you spend a single dollar on anything else. Think of savings as a bill you must pay to your future self. It comes before food, before fun, before everything else.",
            examples: ["Receive $100 → immediately move $20 to savings → spend remaining $80", "Treat savings like rent — non-negotiable"],
          },
          {
            heading: "Why It Works — Behavioural Science",
            body: "Humans naturally spend what's available. If you see $100, you'll find $100 worth of things to buy. But if you only see $80 (because $20 is already in savings), you'll adjust your spending to fit $80. This is called 'mental accounting.' By removing savings before it enters your spending wallet, you eliminate the temptation to spend it. You adapt to the smaller amount naturally.",
            examples: ["Out of sight, out of mind savings", "Automatic transfers on paycheck day", "Savings envelope method"],
          },
          {
            heading: "How to Automate It",
            body: "The most powerful version of this strategy is automation. If your school bank account or piggy bank has two compartments, put your savings portion in immediately. Better yet, if you have a bank account, set up an automatic transfer on the day you receive income. You never see the money, so you can't spend it. Even saving 10% consistently every time builds substantial wealth over years.",
            examples: ["Separate savings jar or envelope", "Two-compartment piggy bank", "Automatic bank transfer on payday", "Save at least 10% of every payment"],
          },
        ],
        questions: [
          { id: "q-s3-1", order_index: 1, question: "What does 'Pay Yourself First' mean?", option_a: "Buy things you want before paying bills", option_b: "Save a portion of your money BEFORE spending on anything else", option_c: "Pay your friends back first", option_d: "Spend all your money and save the rest", correct_answer: "B" },
          { id: "q-s3-2", order_index: 2, question: "You receive $200 in allowance. Using Pay Yourself First, you save 10%. How much do you save?", option_a: "$10", option_b: "$20", option_c: "$50", option_d: "$100", correct_answer: "B" },
          { id: "q-s3-3", order_index: 3, question: "Why does Pay Yourself First work so well?", option_a: "It makes you earn more money", option_b: "Humans naturally adapt to spending what's available after savings are removed", option_c: "It removes the need for a budget", option_d: "It only works for adults", correct_answer: "B" },
          { id: "q-s3-4", order_index: 4, question: "What is the best way to automate the Pay Yourself First strategy?", option_a: "Hope you remember to save each month", option_b: "Spend first and save the rest", option_c: "Set up an automatic transfer to savings on income day", option_d: "Ask a friend to hold your money", correct_answer: "C" },
        ],
      },
    ],
  },
  {
    id: "investing",
    title: "Investing Fundamentals",
    subtitle: "Grow Your Money",
    objective: "Students will understand what investing is, how risk relates to return, and how compound interest makes money grow exponentially over time.",
    icon: <TrendingUp className="w-6 h-6" />,
    colorFrom: "from-violet-500",
    colorTo: "to-purple-600",
    textColor: "text-violet-400",
    bgMuted: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    lessons: [
      {
        id: "static-invest-1",
        title: "What Is Investing?",
        description: "Discover how putting money to work in stocks, bonds, and more builds wealth over time.",
        icon: <TrendingUp className="w-5 h-5" />,
        duration: "10 min",
        objectives: [
          "Define investing and explain how it differs from saving.",
          "Identify common types of investments: stocks, bonds, and mutual funds.",
          "Explain why starting to invest young gives a major advantage.",
        ],
        content_sections: [
          {
            heading: "Saving vs Investing — Key Difference",
            body: "Saving means keeping money safe (usually in a bank) for short-term goals or emergencies — it grows slowly with low interest. Investing means putting money into assets (like stocks or real estate) with the expectation of earning a larger return over time. Investing involves more risk than saving, but it also offers much higher potential growth. For long-term goals (5+ years), investing is typically far more powerful than saving alone.",
            examples: ["Savings account: ~1–3% interest per year", "Stock market: historical ~7–10% average return per year", "Real estate: long-term appreciation"],
          },
          {
            heading: "Types of Investments",
            body: "Stocks are shares of ownership in a company — when the company grows, your share is worth more. Bonds are loans you give to governments or companies, which pay you back with fixed interest. Mutual funds pool money from many investors to buy a diversified mix of stocks and bonds, reducing risk. Exchange-Traded Funds (ETFs) work similarly to mutual funds but are traded on stock exchanges like individual stocks.",
            examples: ["Stocks: owning a piece of a company", "Government bonds: lending to the government", "Mutual funds: pooled diversified investing", "ETFs: low-cost index investing"],
          },
          {
            heading: "Why Starting Young Is a Superpower",
            body: "The earlier you start investing, the more time your money has to grow. A 15-year-old who invests $100/month until age 65 will accumulate far more than a 35-year-old investing $500/month for the same period — because of compound growth. Time in the market matters more than the amount you invest. Even small amounts invested in your teens can become significant wealth by adulthood.",
            examples: ["$100/month from age 15 = massive wealth at 65", "Starting 10 years earlier doubles final wealth", "Use FinSight's Investment Simulator to explore this"],
          },
        ],
        questions: [
          { id: "q-i1-1", order_index: 1, question: "What is the main difference between saving and investing?", option_a: "Saving earns more money than investing", option_b: "Investing involves more risk but offers higher potential growth", option_c: "Investing is only for adults", option_d: "Saving and investing are the same thing", correct_answer: "B" },
          { id: "q-i1-2", order_index: 2, question: "What is a stock?", option_a: "A type of bank account", option_b: "A loan you give to the government", option_c: "A share of ownership in a company", option_d: "A savings certificate", correct_answer: "C" },
          { id: "q-i1-3", order_index: 3, question: "What is a bond?", option_a: "A share of a company you own", option_b: "A loan you give to a government or company that pays you back with interest", option_c: "A type of stock", option_d: "A piggy bank for kids", correct_answer: "B" },
          { id: "q-i1-4", order_index: 4, question: "Why is starting to invest early so important?", option_a: "Young people get better interest rates", option_b: "Investing is easier when you are young", option_c: "More time allows compound growth to multiply wealth significantly", option_d: "Early investors pay less tax", correct_answer: "C" },
        ],
      },
      {
        id: "static-invest-2",
        title: "Risk & Return",
        description: "Understand how risk and potential reward are connected in every investment decision.",
        icon: <Layers className="w-5 h-5" />,
        duration: "10 min",
        objectives: [
          "Define investment risk and explain why it cannot be entirely avoided.",
          "Describe the relationship between risk and potential return.",
          "Use diversification as a strategy to manage risk.",
        ],
        content_sections: [
          {
            heading: "What Is Investment Risk?",
            body: "Investment risk is the possibility that an investment will lose value or not perform as expected. Every investment carries some risk — even keeping money in cash carries the risk of inflation (money losing purchasing power over time). Risk cannot be completely eliminated, but it can be managed. Understanding and accepting risk is an essential part of becoming a smart investor.",
            examples: ["Stock price falling after you buy", "A company going bankrupt", "Inflation reducing purchasing power", "Currency value changing"],
          },
          {
            heading: "The Risk-Return Tradeoff",
            body: "In investing, there is a fundamental rule: higher potential return comes with higher risk, and lower risk comes with lower return. A savings account is very safe (low risk) but earns very little interest (low return). Stocks of a new startup company could double in value (high return) but could also become worthless (high risk). Understanding this tradeoff helps you choose investments that match your goals and how much risk you can comfortably handle.",
            examples: ["Low risk → Low return: savings account, government bonds", "Medium risk → Medium return: blue-chip stocks, ETFs", "High risk → High return: startup stocks, crypto"],
          },
          {
            heading: "Diversification — Don't Put All Your Eggs in One Basket",
            body: "Diversification means spreading your money across different types of investments so that if one performs badly, others may compensate. If you invest all your money in one company and it fails, you lose everything. But if you invest across 20 companies in different industries, one failure won't destroy your portfolio. Mutual funds and ETFs are already diversified by design — one of the reasons they're recommended for beginner investors.",
            examples: ["Mix stocks, bonds, and savings", "Invest in different industries", "Use ETFs for instant diversification", "Never put all money in one investment"],
          },
        ],
        questions: [
          { id: "q-i2-1", order_index: 1, question: "What is investment risk?", option_a: "The fee you pay to a bank", option_b: "The possibility that an investment loses value or underperforms", option_c: "The interest you earn on savings", option_d: "The time it takes to invest", correct_answer: "B" },
          { id: "q-i2-2", order_index: 2, question: "What is the risk-return tradeoff?", option_a: "Higher risk always leads to guaranteed high returns", option_b: "Lower risk investments offer higher returns than risky ones", option_c: "Higher potential return typically comes with higher risk", option_d: "Risk and return are not related", correct_answer: "C" },
          { id: "q-i2-3", order_index: 3, question: "What is diversification?", option_a: "Investing all your money in one winning stock", option_b: "Spreading investments across different types to reduce overall risk", option_c: "Saving in multiple bank accounts", option_d: "Only investing in government bonds", correct_answer: "B" },
          { id: "q-i2-4", order_index: 4, question: "Which type of investment generally has the LOWEST risk?", option_a: "Startup company stocks", option_b: "Cryptocurrency", option_c: "Government bonds and savings accounts", option_d: "Individual company stocks", correct_answer: "C" },
        ],
      },
      {
        id: "static-invest-3",
        title: "The Power of Compound Interest",
        description: "See how 'interest on interest' turns small investments into life-changing wealth over time.",
        icon: <Award className="w-5 h-5" />,
        duration: "12 min",
        objectives: [
          "Define compound interest and explain how it differs from simple interest.",
          "Calculate the effect of compound interest over time using real examples.",
          "Articulate why compound interest is called the eighth wonder of the world.",
        ],
        content_sections: [
          {
            heading: "Simple Interest vs Compound Interest",
            body: "Simple interest is calculated only on your original amount (principal). If you invest $1,000 at 10% simple interest, you earn $100 every year, forever. Compound interest is interest calculated on both your original investment AND all the interest you've already earned. In year 1, you earn $100. In year 2, you earn 10% of $1,100 = $110. In year 3, you earn 10% of $1,210 = $121. The interest keeps growing because your base keeps growing.",
            examples: ["Simple: $1,000 × 10% = $100/year always", "Compound Year 1: $1,000 → $1,100", "Compound Year 2: $1,100 → $1,210", "Compound Year 10: $1,000 → $2,594"],
          },
          {
            heading: "The Eighth Wonder of the World",
            body: "Albert Einstein is said to have called compound interest 'the eighth wonder of the world — he who understands it, earns it; he who doesn't, pays it.' The key insight is that compound growth is exponential, not linear. Early years show slow growth, but later years show explosive acceleration. A $1,000 investment at 8% annual return becomes $2,159 after 10 years, $4,661 after 20 years, and $10,063 after 30 years — without adding any extra money.",
            examples: ["$1,000 at 8%: $2,159 after 10 years", "$1,000 at 8%: $4,661 after 20 years", "$1,000 at 8%: $10,063 after 30 years"],
          },
          {
            heading: "Start Early — Time Is Your Greatest Asset",
            body: "Two friends: Maya starts investing $50/month at age 15 and stops at age 25 (10 years, $6,000 invested). Jordan starts at age 25 and invests $50/month until age 65 (40 years, $24,000 invested). At age 65, assuming 8% return, Maya has more money than Jordan — despite investing 4x less! This is the power of starting early. Every year you delay costs you enormously in future wealth.",
            examples: ["Maya (start age 15): $6,000 invested → larger final amount", "Jordan (start age 25): $24,000 invested → smaller final amount", "Time beats money invested"],
          },
        ],
        questions: [
          { id: "q-i3-1", order_index: 1, question: "What is compound interest?", option_a: "Interest paid only on the original investment", option_b: "A fee charged by banks for using their services", option_c: "Interest calculated on both the principal and accumulated interest", option_d: "A fixed amount added each year", correct_answer: "C" },
          { id: "q-i3-2", order_index: 2, question: "You invest $500 at 10% compound interest. After year 1 you have $550. How much do you have after year 2?", option_a: "$600", option_b: "$605", option_c: "$620", option_d: "$650", correct_answer: "B" },
          { id: "q-i3-3", order_index: 3, question: "Why is starting to invest early so powerful with compound interest?", option_a: "Young investors pay less taxes", option_b: "More time allows interest to compound on itself many more times", option_c: "Early investors get higher interest rates", option_d: "Compound interest only works for young people", correct_answer: "B" },
          { id: "q-i3-4", order_index: 4, question: "Who famously called compound interest 'the eighth wonder of the world'?", option_a: "Warren Buffett", option_b: "Isaac Newton", option_c: "Albert Einstein", option_d: "Benjamin Franklin", correct_answer: "C" },
        ],
      },
    ],
  },
];

const STORAGE_KEY = "finsight_static_completed";

// ─── Certificate Generation ────────────────────────────────────────────────────

function generateCertificate(
  studentName: string,
  contextName: string,
  completionDate: string,
  type: "lesson" | "module"
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, H, "F");

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(10, 10, W - 20, H - 20, 6, 6, "F");

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1.5);
  doc.roundedRect(10, 10, W - 20, H - 20, 6, 6, "S");

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 14, W - 28, H - 28, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(167, 139, 250);
  doc.text("FINSIGHT LITE", W / 2, 32, { align: "center" });

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("Certificate of Completion", W / 2, 55, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("This certificate is proudly presented to", W / 2, 72, { align: "center" });

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(32);
  doc.setTextColor(52, 211, 153);
  doc.text(studentName || "Student", W / 2, 96, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  const completionPhrase = type === "module"
    ? "for successfully completing the module"
    : "for successfully completing the lesson";
  doc.text(completionPhrase, W / 2, 112, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(251, 191, 36);
  doc.text(contextName, W / 2, 126, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const scoreNote = type === "module"
    ? "having completed all lessons in this module with 80% or above"
    : "with a score of 80% or above";
  doc.text(scoreNote, W / 2, 138, { align: "center" });

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.5);
  doc.line(60, 148, W - 60, 148);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date of Completion: ${completionDate}`, W / 2, 158, { align: "center" });
  doc.text("FinSight Lite — Financial Literacy for Caribbean Youth", W / 2, 166, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(99, 102, 241);
  doc.text("★", 50, 170);
  doc.text("★", W - 50, 170, { align: "right" });

  const safeContext = contextName.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
  doc.save(`FinSight_Certificate_${safeContext}.pdf`);

  // Best-effort email a copy to the verified email + guardian.
  try {
    const dataUri = doc.output("datauristring");
    const pdfBase64 = dataUri.split(",")[1];
    if (pdfBase64) {
      void fetch("/api/certificates/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, lessonTitle: contextName, kind: type, sendToGuardian: true }),
      }).catch(() => {});
    }
  } catch {}
}

async function generateFinancialAcademyCertificate(
  studentFullName: string,
  moduleName: string,
  completionDate: string,
  branding?: FinancialAcademyBranding
) {
  const leftName = (branding?.leftName?.trim() || "Lakeisha Deveaux");
  const leftRole = (branding?.leftRole?.trim() || "GENERAL INSTRUCTOR");
  const rightName = (branding?.rightName?.trim() || "Annie Brown");
  const rightRole = (branding?.rightRole?.trim() || "ASSISTANT INSTRUCTOR");
  const logoSource = branding?.logoUrl?.trim() || faLogoUrl;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  // Outer gold border
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(2);
  doc.rect(8, 8, W - 16, H - 16, "S");

  // Inner thin border
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, W - 24, H - 24, "S");

  // Logo (header seal) — uses org-uploaded logo if present, else default
  const logo = await loadImageAsPngDataUrl(logoSource);
  if (logo) {
    const logoW = 38;
    const logoH = 38;
    doc.addImage(logo, "PNG", (W - logoW) / 2, 18, logoW, logoH);
  }

  // Title block
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

  // Student name
  doc.setFont("times", "bolditalic");
  doc.setFontSize(34);
  doc.setTextColor(30, 30, 30);
  const safeName = (studentFullName || "Student").trim();
  doc.text(safeName, W / 2, 116, { align: "center" });

  // Decorative underline below name
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  const nameWidth = doc.getTextWidth(safeName);
  const underlineHalf = Math.min(Math.max(nameWidth / 2 + 10, 50), 110);
  doc.line(W / 2 - underlineHalf, 121, W / 2 + underlineHalf, 121);

  // Body sentence
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(50, 50, 50);
  const bodyLine = `for successfully completing the "${moduleName}".`;
  doc.text(bodyLine, W / 2, 134, { align: "center" });

  // Completion date
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`Date of Completion: ${completionDate}`, W / 2, 144, { align: "center" });

  // Signature blocks
  const sigY = 178;
  const leftX = 70;
  const rightX = W - 70;

  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.4);
  doc.line(leftX - 35, sigY - 6, leftX + 35, sigY - 6);
  doc.line(rightX - 35, sigY - 6, rightX + 35, sigY - 6);

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(leftName, leftX, sigY, { align: "center" });
  doc.text(rightName, rightX, sigY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(leftRole, leftX, sigY + 5, { align: "center" });
  doc.text(rightRole, rightX, sigY + 5, { align: "center" });

  // Footer tagline
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text('The Financial Academy — "Smart Finances, Secure Future."', W / 2, H - 14, { align: "center" });

  const safeMod = moduleName.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
  doc.save(`Financial_Academy_Certificate_${safeMod}.pdf`);

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

// ─── Video Player Component ────────────────────────────────────────────────────

const HTML5_VIDEO_EXTS = [".mp4", ".webm", ".ogg"];

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    }
    if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  } catch {}
  return null;
}

function LessonVideoPlayer({ url }: { url: string | null | undefined }) {
  if (!url) return null;

  if (url === "coming_soon") {
    return (
      <Card className="glass-card rounded-glass border-0">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Video className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-sm">Video Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-0.5">A video for this lesson will be available shortly.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(url);
  if (embedUrl) {
    return (
      <Card className="glass-card rounded-glass border-0 overflow-hidden">
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title="Lesson Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </Card>
    );
  }

  const isHtml5 = HTML5_VIDEO_EXTS.some(ext => url.toLowerCase().endsWith(ext));
  if (isHtml5) {
    return (
      <Card className="glass-card rounded-glass border-0 overflow-hidden">
        <video controls className="w-full rounded-xl">
          <source src={url} />
          Your browser does not support video playback.
        </video>
      </Card>
    );
  }

  return (
    <Card className="glass-card rounded-glass border-0">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
          <Video className="w-5 h-5 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Lesson Video</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{url}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-teal-400 hover:text-teal-300 shrink-0"
        >
          Open →
        </a>
      </CardContent>
    </Card>
  );
}

// ─── Module Card Component ─────────────────────────────────────────────────────

function ModuleCard({
  module,
  completed,
  onOpenLesson,
}: {
  module: StaticModule;
  completed: string[];
  onOpenLesson: (lesson: StaticLesson, module: StaticModule) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const doneCount = module.lessons.filter(l => completed.includes(l.id)).length;
  const pct = Math.round((doneCount / module.lessons.length) * 100);

  return (
    <div className={`rounded-2xl border ${module.borderColor} bg-white/5 backdrop-blur-sm overflow-hidden`} data-testid={`module-card-${module.id}`}>
      {/* Module Header */}
      <div className={`bg-gradient-to-r ${module.colorFrom} ${module.colorTo} p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
              {module.icon}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white leading-tight">{module.title}</h2>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mt-0.5">{module.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-white/70 hover:text-white transition-colors mt-1 flex-shrink-0"
            data-testid={`button-expand-module-${module.id}`}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-white/80 text-xs font-semibold mb-1.5">
            <span>{doneCount}/{module.lessons.length} lessons complete</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-4">
          {/* Learning Objective */}
          <div className={`${module.bgMuted} rounded-xl p-4 border ${module.borderColor}`}>
            <div className="flex items-start gap-2.5">
              <Target className={`w-4 h-4 ${module.textColor} flex-shrink-0 mt-0.5`} />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Learning Objective</p>
                <p className="text-sm text-foreground leading-relaxed">{module.objective}</p>
              </div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="space-y-2">
            {module.lessons.map((lesson, idx) => {
              const isDone = completed.includes(lesson.id);
              return (
                <button
                  key={lesson.id}
                  onClick={() => onOpenLesson(lesson, module)}
                  className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group flex items-center gap-3"
                  data-testid={`lesson-item-${lesson.id}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    isDone
                      ? "bg-green-500/20 text-green-400"
                      : `${module.bgMuted} ${module.textColor}`
                  }`}>
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : lesson.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">Lesson {idx + 1}</span>
                      {isDone && <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Completed</span>}
                    </div>
                    <p className="font-bold text-sm text-foreground truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">{lesson.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />{lesson.duration}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground group-hover:${module.textColor} transition-colors`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {doneCount === module.lessons.length
                ? "🎉 Module complete!"
                : `${module.lessons.length - doneCount} lesson${module.lessons.length - doneCount !== 1 ? "s" : ""} remaining`}
            </span>
            <Button
              onClick={() => {
                const next = module.lessons.find(l => !completed.includes(l.id)) ?? module.lessons[0];
                onOpenLesson(next, module);
              }}
              size="sm"
              className={`rounded-xl bg-gradient-to-r ${module.colorFrom} ${module.colorTo} text-white font-bold shadow-md text-xs px-4`}
              data-testid={`button-start-module-${module.id}`}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {doneCount === 0 ? "Start" : doneCount === module.lessons.length ? "Review" : "Continue"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Lessons() {
  const { user } = useAuth();
  const certificateFullName = (() => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return fullName || user?.username || "Student";
  })();
  const [pageState, setPageState] = useState<PageState>("list");
  const [selectedLesson, setSelectedLesson] = useState<LessonWithQuestions | null>(null);
  const [activeModule, setActiveModule] = useState<StaticModule | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [quizResults, setQuizResults] = useState<any>(null);

  // Static lesson completion tracking
  const [completedStatic, setCompletedStatic] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });

  // Inline join code state
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
  });

  const markStaticDone = (lessonId: string): string[] => {
    if (completedStatic.includes(lessonId)) return completedStatic;
    const next = [...completedStatic, lessonId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCompletedStatic(next);
    return next;
  };

  const handleJoinCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError("Please enter a code."); return; }
    setIsJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      const checkRes = await fetch(`/api/classes/check-code/${encodeURIComponent(code)}`, { credentials: "include" });
      const checkData = await checkRes.json();
      if (!checkRes.ok) { setJoinError(checkData.message || "Code not found."); return; }

      const endpoint = checkData.type === "org" ? "/api/org/join" : "/api/student/join-class";
      const joinRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      const joinData = await joinRes.json();
      if (!joinRes.ok) { setJoinError(joinData.message || "Could not join. Try again."); return; }

      const label = checkData.type === "org" ? `${checkData.name} — ${checkData.envName}` : checkData.name;
      setJoinSuccess(`You've joined ${label}! Your lessons will appear below.`);
      setJoinCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    } catch {
      setJoinError("Something went wrong. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const completeMutation = useMutation({
    mutationFn: async ({ id, answers }: { id: string; answers: string[] }) => {
      const res = await apiRequest("POST", `/api/lessons/${id}/complete`, { answers });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/xp"] });
    },
  });

  const openOrgLesson = async (lesson: Lesson) => {
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load lesson" }));
        throw new Error(err.message ?? "Failed to load lesson");
      }
      const data: LessonWithQuestions = await res.json();
      setSelectedLesson(data);
      setActiveModule(null);
      setPageState("reading");
      setCurrentQ(0);
      setSelected(null);
      setShowResult(false);
      setAnswers([]);
      setQuizResults(null);
    } catch (e) {
      console.error("Failed to load lesson:", e);
    }
  };

  const openStaticLesson = (staticLesson: StaticLesson, mod: StaticModule) => {
    const asLesson: LessonWithQuestions = {
      id: staticLesson.id,
      org_id: "static",
      title: staticLesson.title,
      duration: staticLesson.duration,
      video_url: staticLesson.videoUrl ?? null,
      objectives: staticLesson.objectives,
      content_sections: staticLesson.content_sections,
      questions: staticLesson.questions,
      is_published: true,
      created_at: new Date().toISOString(),
      isStatic: true,
    };
    setSelectedLesson(asLesson);
    setActiveModule(mod);
    setPageState("reading");
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setAnswers([]);
    setQuizResults(null);
  };

  const startQuiz = () => {
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setAnswers([]);
    setPageState("quiz");
  };

  const handleAnswer = (letter: string) => {
    if (showResult || !selectedLesson) return;
    setSelected(letter);
    setShowResult(true);
    const newAnswers = [...answers, letter];
    setAnswers(newAnswers);

    setTimeout(async () => {
      if (currentQ < selectedLesson.questions.length - 1) {
        setCurrentQ(i => i + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        if (selectedLesson.isStatic) {
          // Static lessons: compute score locally
          const finalCorrect = newAnswers.filter((a, i) => a === selectedLesson.questions[i]?.correct_answer).length;
          const total = selectedLesson.questions.length;
          const xpEarned = finalCorrect * 10;
          const scorePct = total > 0 ? Math.round((finalCorrect / total) * 100) : 0;
          // Only mark as done if 80%+
          let updatedCompleted = completedStatic;
          if (scorePct >= 80) {
            updatedCompleted = markStaticDone(selectedLesson.id);
          }
          // Detect module completion: all lessons in activeModule completed with 80%+
          const moduleComplete = activeModule
            ? activeModule.lessons.every(l => updatedCompleted.includes(l.id))
            : false;
          setQuizResults({ finalCorrect, total, xpEarned, moduleComplete });
          setPageState("results");
        } else {
          const result = await completeMutation.mutateAsync({ id: selectedLesson.id, answers: newAnswers });
          setQuizResults({
            ...result,
            finalCorrect: result.correctAnswers ?? newAnswers.filter((a, i) => a === selectedLesson.questions[i]?.correct_answer).length,
            total: result.total ?? selectedLesson.questions.length,
          });
          setPageState("results");
        }
      }
    }, 1400);
  };

  const goBack = () => {
    setPageState("list");
    setSelectedLesson(null);
    setActiveModule(null);
  };

  const currentQuestion = selectedLesson?.questions[currentQ];
  const correctCount = selectedLesson
    ? answers.reduce((acc, ans, i) => acc + (ans === selectedLesson.questions[i]?.correct_answer ? 1 : 0), 0)
    : 0;
  const pct = selectedLesson ? Math.round(((quizResults?.finalCorrect ?? correctCount) / (selectedLesson.questions.length || 1)) * 100) : 0;

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* ── Lesson List ── */}
          {pageState === "list" && (
            <div className="space-y-8">
              <div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-white" data-testid="text-lessons-title">
                  My Lessons
                </h1>
                <p className="text-white/85 mt-1">OECD-aligned financial literacy — read, learn, and quiz yourself.</p>
              </div>

              {/* ── Built-in OECD Modules ── */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-violet-400" />
                  <h2 className="font-display font-bold text-lg text-white">Core Curriculum</h2>
                  <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2.5 py-0.5 rounded-full font-semibold">OECD-Aligned</span>
                </div>
                <div className="space-y-4">
                  {STATIC_MODULES.map(mod => (
                    <ModuleCard
                      key={mod.id}
                      module={mod}
                      completed={completedStatic}
                      onOpenLesson={openStaticLesson}
                    />
                  ))}
                </div>
              </section>

              {/* ── Org / Class Lessons ── */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-teal-400" />
                  <h2 className="font-display font-bold text-lg text-white">School Lessons</h2>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-white/75" />
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="space-y-3">
                    <div className="glass-card rounded-glass p-8 text-center">
                      <BookOpen className="w-10 h-10 text-teal-400 mx-auto mb-3 opacity-60" />
                      <p className="font-bold">No school lessons yet</p>
                      <p className="text-muted-foreground text-sm mt-1">Enter your class or organization code to unlock lessons from your school.</p>
                    </div>
                    <div className="glass-card rounded-glass p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <KeyRound className="w-5 h-5 text-violet-400" />
                        <span className="font-bold text-sm">Enter your code</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={joinCode}
                          onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); setJoinSuccess(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleJoinCode()}
                          placeholder="e.g. 3KMXJD"
                          className="rounded-xl font-mono text-center tracking-widest uppercase h-11"
                          maxLength={8}
                          data-testid="input-join-code-lessons"
                        />
                        <Button
                          onClick={handleJoinCode}
                          disabled={isJoining || !joinCode.trim()}
                          className="rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold px-5 shrink-0"
                          data-testid="button-join-code-lessons"
                        >
                          {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                        </Button>
                      </div>
                      {joinError && <p className="text-destructive text-sm font-medium" data-testid="text-join-error">{joinError}</p>}
                      {joinSuccess && <p className="text-green-400 text-sm font-medium" data-testid="text-join-success">{joinSuccess}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lessons.map((lesson) => (
                      <Card
                        key={lesson.id}
                        className="glass-card rounded-glass border-0 cursor-pointer hover:scale-[1.01] transition-all"
                        onClick={() => openOrgLesson(lesson)}
                        data-testid={`lesson-card-${lesson.id}`}
                      >
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                            <BookMarked className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-lg truncate">{lesson.title}</h3>
                              {lesson.subject && (
                                <span className="text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-medium">
                                  {lesson.subject}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                              {lesson.instructor && <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {lesson.instructor}</span>}
                              {lesson.grade_level && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Grade {lesson.grade_level}</span>}
                              {lesson.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {lesson.duration}</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── Reading View ── */}
          {pageState === "reading" && selectedLesson && (
            <div className="space-y-6 animate-bounce-in">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-2xl border-2" onClick={goBack} data-testid="button-back-lessons">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  {activeModule && (
                    <div className={`flex items-center gap-1.5 mb-1`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${activeModule.textColor}`}>{activeModule.title}</span>
                    </div>
                  )}
                  <h1 className="font-display text-2xl font-bold text-white truncate" data-testid="text-lesson-title">{selectedLesson.title}</h1>
                  <div className="flex items-center gap-3 text-white/75 text-sm flex-wrap mt-0.5">
                    {selectedLesson.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedLesson.duration}</span>}
                    {selectedLesson.instructor && <span>{selectedLesson.instructor}</span>}
                    {selectedLesson.subject && <span>· {selectedLesson.subject}</span>}
                  </div>
                </div>
              </div>

              {/* Lesson Video */}
              <LessonVideoPlayer url={selectedLesson.video_url} />

              {/* Learning Objectives */}
              {selectedLesson.objectives.length > 0 && (
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-6">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Target className="w-4 h-4 text-violet-400" />
                      </div>
                      Learning Objectives
                    </h2>
                    <ul className="space-y-2">
                      {selectedLesson.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm" data-testid={`objective-${i}`}>
                          <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-teal-400 font-bold text-xs">{i + 1}</span>
                          </div>
                          <span className="text-foreground">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Content Sections */}
              {selectedLesson.content_sections.map((section, i) => (
                <Card key={i} className="glass-card rounded-glass border-0">
                  <CardContent className="p-6">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                      </div>
                      {section.heading}
                    </h2>
                    <p className="text-foreground text-sm leading-relaxed mb-3" data-testid={`section-body-${i}`}>{section.body}</p>
                    {section.examples && section.examples.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <ListChecks className="w-3.5 h-3.5" /> Examples
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {section.examples.map((ex, j) => (
                            <span key={j} className="text-sm bg-teal-500/10 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl font-medium" data-testid={`example-${i}-${j}`}>
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Start Quiz */}
              {selectedLesson.questions.length > 0 && (
                <Card className="glass-card-coral rounded-glass border-0">
                  <CardContent className="p-6 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground">Ready to test yourself?</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedLesson.questions.length} questions · Earn {selectedLesson.questions.length * 10} XP
                      </p>
                    </div>
                    <Button
                      onClick={startQuiz}
                      className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold px-6 shadow-lg shrink-0"
                      data-testid="button-start-quiz"
                    >
                      Start Quiz
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Quiz View ── */}
          {pageState === "quiz" && currentQuestion && selectedLesson && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-2xl border-2" onClick={() => setPageState("reading")} data-testid="button-back-reading">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/85">Question {currentQ + 1} / {selectedLesson.questions.length}</span>
                    <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-4 h-4" /> {correctCount} correct
                    </span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${((currentQ + 1) / selectedLesson.questions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <Card className="glass-card rounded-glass border-0">
                <CardContent className="p-6 lg:p-8">
                  <h2 className="text-xl font-bold leading-relaxed" data-testid="text-quiz-question">{currentQuestion.question}</h2>
                </CardContent>
              </Card>

              <div className="grid gap-3">
                {OPTIONS.map((opt, i) => {
                  const letter = LETTERS[i];
                  const optionText = currentQuestion[opt];
                  const isSelected = selected === letter;
                  const isCorrect = letter === currentQuestion.correct_answer;

                  let cls = "border-white/20 hover:border-teal-400 hover:scale-[1.01]";
                  if (showResult) {
                    if (isCorrect) cls = "border-green-500 bg-green-500/10 scale-[1.01]";
                    else if (isSelected) cls = "border-red-500 bg-red-500/10";
                    else cls = "border-white/10 opacity-50";
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(letter)}
                      disabled={showResult}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 glass-card ${cls}`}
                      data-testid={`quiz-option-${i}`}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                        showResult && isCorrect ? "bg-green-500 text-white" :
                        showResult && isSelected ? "bg-red-500 text-white" :
                        "bg-white/10 text-white"
                      }`}>
                        {showResult && isCorrect ? <CheckCircle2 className="w-5 h-5" /> :
                         showResult && isSelected ? <XCircle className="w-5 h-5" /> : letter}
                      </span>
                      <span className="font-medium text-sm leading-snug text-foreground">{optionText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Results View ── */}
          {pageState === "results" && quizResults && selectedLesson && (
            <div className="space-y-6 text-center animate-bounce-in">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-xl text-5xl">
                {pct >= 80 ? "🏆" : pct >= 50 ? "⭐" : "💪"}
              </div>

              <div className="text-white">
                <h1 className="font-display text-3xl font-bold">Quiz Complete!</h1>
                <p className="text-white/85 mt-2">{selectedLesson.title}</p>
                {selectedLesson.isStatic && pct >= 80 && (
                  <p className="text-green-400 font-bold text-sm mt-1">✓ Lesson marked as complete</p>
                )}
                {quizResults?.moduleComplete && activeModule && (
                  <p className="text-amber-400 font-bold text-sm mt-1">🏅 Module "{activeModule.title}" fully completed!</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-teal-400" data-testid="text-quiz-score">{quizResults.finalCorrect}/{quizResults.total}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Correct</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-400">{pct}%</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Score</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <span className="xp-pill text-lg" data-testid="text-xp-earned">+{quizResults.xpEarned}</span>
                    <p className="text-xs font-bold text-muted-foreground mt-1">XP Earned</p>
                  </CardContent>
                </Card>
              </div>

              {pct === 100 && (
                <Card className="glass-card-coral rounded-glass border-0">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-amber-500 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-display font-bold text-foreground">Perfect Score! 🎉</p>
                      <p className="text-sm text-muted-foreground">Outstanding work — you've mastered this lesson.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {quizResults?.moduleComplete && activeModule && (
                <Card className="glass-card rounded-glass border-0" style={{ borderColor: "rgba(251,191,36,0.3)" }}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm">Module Complete! 🏅</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Download your module certificate of completion.</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Certificate name: <span className="font-semibold text-white" data-testid="text-certificate-name-module">{certificateFullName}</span>
                        {" · "}
                        <Link href="/settings" className="underline text-teal-300 hover:text-teal-200" data-testid="link-edit-name-module">Edit name</Link>
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        const studentName = certificateFullName;
                        const contextName = activeModule.title;
                        const completionDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
                        generateCertificate(studentName, contextName, completionDate, "module");
                      }}
                      className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold shrink-0 shadow-lg"
                      data-testid="button-download-module-certificate"
                    >
                      <Download className="w-4 h-4 mr-2" /> Module Certificate
                    </Button>
                  </CardContent>
                </Card>
              )}

              {pct >= 80 && (
                <Card className="glass-card rounded-glass border-0" style={{ borderColor: "rgba(251,191,36,0.2)" }}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Award className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm">
                        {isFinancialAcademyLesson(selectedLesson)
                          ? "Financial Academy Module Certificate Earned!"
                          : "Lesson Certificate Earned!"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isFinancialAcademyLesson(selectedLesson)
                          ? "Download your official Financial Academy certificate of module completion."
                          : "Download your certificate of completion for this lesson."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Certificate name: <span className="font-semibold text-white" data-testid="text-certificate-name-lesson">{certificateFullName}</span>
                        {" · "}
                        <Link href="/settings" className="underline text-teal-300 hover:text-teal-200" data-testid="link-edit-name-lesson">Edit name</Link>
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        const studentName = certificateFullName;
                        const contextName = selectedLesson.title;
                        const completionDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
                        if (isFinancialAcademyLesson(selectedLesson)) {
                          await generateFinancialAcademyCertificate(studentName, contextName, completionDate, {
                            logoUrl: selectedLesson.org_logo_url,
                            leftName: selectedLesson.org_signature_left_name,
                            leftRole: selectedLesson.org_signature_left_role,
                            rightName: selectedLesson.org_signature_right_name,
                            rightRole: selectedLesson.org_signature_right_role,
                          });
                        } else {
                          generateCertificate(studentName, contextName, completionDate, "lesson");
                        }
                      }}
                      className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold shrink-0 shadow-lg"
                      data-testid="button-download-certificate"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setPageState("reading")} className="rounded-2xl border-white/30 text-white hover:bg-white/10">
                  <BookOpen className="w-4 h-4 mr-2" /> Review Lesson
                </Button>
                <Button onClick={goBack} className="rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold">
                  <Award className="w-4 h-4 mr-2" /> Back to Lessons
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
