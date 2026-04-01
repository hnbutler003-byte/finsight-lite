import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";

// Accept long JWT keys only (short sb_publishable_ keys are client-side only)
const supabaseKey = serviceKey.startsWith("eyJ") ? serviceKey
  : anonKey.startsWith("eyJ") ? anonKey
  : "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("[Supabase] Missing or invalid API keys — Supabase features disabled.");
}

if (supabaseKey && !serviceKey.startsWith("eyJ")) {
  console.warn("[Supabase] Using anon key (no valid service_role key found). RLS policies will apply.");
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : null;

export type Organization = {
  id: string;
  name: string;
  type: "school" | "credit_union" | "government" | "ngo" | "other";
  country: string;
  city?: string;
  website?: string;
  contact_name?: string;
  contact_email?: string;
  logo_url?: string;
  is_active: boolean;
  subscription_tier: "free" | "standard" | "premium";
  max_students: number;
  created_at: string;
};

export type OrgEnvironment = {
  id: string;
  org_id: string;
  slug: string;
  display_name: string;
  theme_color?: string;
  custom_logo_url?: string;
  features_enabled: string[];
  join_code?: string | null;
  created_at: string;
};

export type OrgStudent = {
  id: string;
  org_id: string;
  env_id: string;
  student_user_id: string;
  joined_at: string;
};

export type ContentSection = {
  heading: string;
  body: string;
  examples?: string[];
};

export type LessonPlan = {
  id: string;
  org_id: string;
  env_id?: string | null;
  title: string;
  instructor?: string | null;
  subject?: string | null;
  grade_level?: string | null;
  topic?: string | null;
  duration?: string | null;
  objectives: string[];
  content_sections: ContentSection[];
  is_published: boolean;
  created_at: string;
};

export type LessonQuizQuestion = {
  id: string;
  lesson_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  order_index: number;
};

export type LessonWithQuestions = LessonPlan & {
  questions: LessonQuizQuestion[];
};

// SQL to run in Supabase SQL Editor:
const INIT_SQL = `
-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'school',
  country text NOT NULL DEFAULT 'Bahamas',
  city text,
  website text,
  contact_name text,
  contact_email text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  subscription_tier text NOT NULL DEFAULT 'free',
  max_students integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Organization environments (one per school/class group)
CREATE TABLE IF NOT EXISTS org_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  theme_color text DEFAULT '#7c3aed',
  custom_logo_url text,
  features_enabled text[] DEFAULT ARRAY['money_games','investment_sim','money_guide','moneylab'],
  join_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Students linked to organizations/environments
CREATE TABLE IF NOT EXISTS org_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  env_id uuid NOT NULL REFERENCES org_environments(id) ON DELETE CASCADE,
  student_user_id text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(env_id, student_user_id)
);

-- Leaderboard snapshots (heavy data — lives in Supabase)
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  env_id uuid REFERENCES org_environments(id) ON DELETE CASCADE,
  student_user_id text NOT NULL,
  display_name text NOT NULL,
  avatar text,
  total_xp integer NOT NULL DEFAULT 0,
  exams_passed integer NOT NULL DEFAULT 0,
  games_won integer NOT NULL DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(env_id, student_user_id, snapshot_date)
);

-- Global analytics events (heavy data — lives in Supabase)
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  env_id uuid REFERENCES org_environments(id) ON DELETE SET NULL,
  student_user_id text,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Organization lesson plans
CREATE TABLE IF NOT EXISTS lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  env_id uuid REFERENCES org_environments(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructor text,
  subject text,
  grade_level text,
  topic text,
  duration text,
  objectives text[] DEFAULT ARRAY[]::text[],
  content_sections jsonb DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lesson quiz questions
CREATE TABLE IF NOT EXISTS lesson_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL,
  order_index integer NOT NULL DEFAULT 0
);
`;

export async function initSupabaseTables(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("organizations").select("id").limit(1);
  if (!error) {
    console.log("[Supabase] ✓ Connected — tables verified.");
  } else if (
    error.message?.includes("not found") ||
    error.message?.includes("schema cache") ||
    error.code === "42P01" ||
    error.code === "PGRST200"
  ) {
    console.warn("[Supabase] ⚠ Connected but tables not created yet. Run the SQL setup in your Supabase SQL Editor.");
  } else {
    console.error("[Supabase] Connection check failed:", error.message);
  }
}

export async function getOrganizations(): Promise<Organization[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] getOrganizations:", error.message); return []; }
  return data ?? [];
}

export async function getOrganization(id: string): Promise<Organization | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export async function getOrganizationByName(name: string): Promise<Organization | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("organizations").select("*").eq("name", name).limit(1).single();
  if (error) return null;
  return data;
}

export async function createOrganization(org: Omit<Organization, "id" | "created_at">): Promise<Organization | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("organizations").insert(org).select().single();
  if (error) { console.error("[Supabase] createOrganization:", error.message); return null; }
  return data;
}

export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("organizations").update(updates).eq("id", id).select().single();
  if (error) { console.error("[Supabase] updateOrganization:", error.message); return null; }
  return data;
}

export async function getOrgEnvironments(orgId: string): Promise<OrgEnvironment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("org_environments").select("*").eq("org_id", orgId).order("created_at");
  if (error) { console.error("[Supabase] getOrgEnvironments:", error.message); return []; }
  const envs: OrgEnvironment[] = data ?? [];

  // Auto-assign join codes for any environments missing one (backward compat for pre-Task#8 records)
  const updated = await Promise.all(envs.map(async (env) => {
    if (!env.join_code) {
      const code = await generateUniqueJoinCode();
      await supabase!.from("org_environments").update({ join_code: code }).eq("id", env.id);
      return { ...env, join_code: code };
    }
    return env;
  }));

  return updated;
}

// ─── Join Code Helpers ────────────────────────────────────────────────────────

// Characters that are visually unambiguous (no O/0, I/1/l)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len = 6): string {
  let result = "";
  for (let i = 0; i < len; i++) {
    result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return result;
}

export async function generateUniqueJoinCode(): Promise<string> {
  if (!supabase) return randomCode();
  // Retry on collision — with 32^6 = ~1B possible codes, collision probability is negligible
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode();
    const { data } = await supabase.from("org_environments").select("id").eq("join_code", code).limit(1);
    if (!data || data.length === 0) return code;
  }
  // Should never reach here in practice; randomCode always generates exactly 6 chars
  return randomCode();
}

export async function createOrgEnvironment(env: Omit<OrgEnvironment, "id" | "created_at">): Promise<OrgEnvironment | null> {
  if (!supabase) return null;
  const join_code = env.join_code ?? await generateUniqueJoinCode();
  const { data, error } = await supabase.from("org_environments").insert({ ...env, join_code }).select().single();
  if (error) { console.error("[Supabase] createOrgEnvironment:", error.message); return null; }
  return data;
}

export async function getOrgEnvironmentById(id: string): Promise<OrgEnvironment | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("org_environments").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export async function getOrgEnvironmentByJoinCode(code: string): Promise<OrgEnvironment | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("org_environments")
    .select("*")
    .eq("join_code", code.toUpperCase().trim())
    .single();
  if (error) return null;
  return data;
}

export async function enrollStudentInOrg(
  orgId: string,
  envId: string,
  studentUserId: string
): Promise<{ success: boolean; alreadyEnrolled: boolean; enrollment: any | null }> {
  if (!supabase) return { success: false, alreadyEnrolled: false, enrollment: null };

  // Check if already enrolled
  const { data: existing } = await supabase
    .from("org_students")
    .select("id")
    .eq("env_id", envId)
    .eq("student_user_id", studentUserId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, alreadyEnrolled: true, enrollment: existing[0] };
  }

  const { data, error } = await supabase
    .from("org_students")
    .insert({ org_id: orgId, env_id: envId, student_user_id: studentUserId })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation gracefully
    if (error.code === "23505") {
      return { success: true, alreadyEnrolled: true, enrollment: null };
    }
    console.error("[Supabase] enrollStudentInOrg:", error.message);
    return { success: false, alreadyEnrolled: false, enrollment: null };
  }

  return { success: true, alreadyEnrolled: false, enrollment: data };
}

export async function upsertLeaderboardSnapshot(entry: {
  org_id?: string; env_id?: string; student_user_id: string;
  display_name: string; avatar?: string; total_xp: number;
  exams_passed: number; games_won: number;
}): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("leaderboard_snapshots").upsert(
    { ...entry, snapshot_date: new Date().toISOString().split("T")[0] },
    { onConflict: "env_id,student_user_id,snapshot_date" }
  );
  if (error) console.error("[Supabase] upsertLeaderboard:", error.message);
}

export async function getLeaderboard(envId?: string, limit = 50): Promise<any[]> {
  if (!supabase) return [];
  let q = supabase.from("leaderboard_snapshots")
    .select("*")
    .eq("snapshot_date", new Date().toISOString().split("T")[0])
    .order("total_xp", { ascending: false })
    .limit(limit);
  if (envId) q = q.eq("env_id", envId);
  const { data, error } = await q;
  if (error) { console.error("[Supabase] getLeaderboard:", error.message); return []; }
  return data ?? [];
}

export async function trackEvent(event: {
  org_id?: string; env_id?: string; student_user_id?: string;
  event_type: string; event_data?: Record<string, any>;
}): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("analytics_events").insert(event);
  if (error) console.error("[Supabase] trackEvent:", error.message);
}

// ─── Lesson Plans ─────────────────────────────────────────────────────────────

export async function getLessonsByOrg(orgId: string): Promise<LessonPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lesson_plans")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] getLessonsByOrg:", error.message); return []; }
  return (data ?? []).map(normalizeLessonPlan);
}

export async function getPublishedLessons(orgId?: string): Promise<LessonPlan[]> {
  if (!supabase) return [];
  let q = supabase.from("lesson_plans").select("*").eq("is_published", true).order("created_at", { ascending: false });
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q;
  if (error) { console.error("[Supabase] getPublishedLessons:", error.message); return []; }
  return (data ?? []).map(normalizeLessonPlan);
}

export async function getPublishedLessonsByEnv(envId: string): Promise<LessonPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lesson_plans")
    .select("*")
    .eq("is_published", true)
    .eq("env_id", envId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Supabase] getPublishedLessonsByEnv:", error.message); return []; }
  return (data ?? []).map(normalizeLessonPlan);
}

export async function getLessonWithQuestions(lessonId: string): Promise<LessonWithQuestions | null> {
  if (!supabase) return null;
  const { data: lesson, error: le } = await supabase
    .from("lesson_plans").select("*").eq("id", lessonId).single();
  if (le || !lesson) return null;
  const { data: questions, error: qe } = await supabase
    .from("lesson_quiz_questions").select("*").eq("lesson_id", lessonId).order("order_index");
  if (qe) { console.error("[Supabase] getLessonWithQuestions questions:", qe.message); }
  return { ...normalizeLessonPlan(lesson), questions: questions ?? [] };
}

export async function createLessonPlan(plan: Omit<LessonPlan, "id" | "created_at">): Promise<LessonPlan | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("lesson_plans").insert({
    ...plan,
    objectives: plan.objectives ?? [],
    content_sections: plan.content_sections ?? [],
  }).select().single();
  if (error) { console.error("[Supabase] createLessonPlan:", error.message); return null; }
  return normalizeLessonPlan(data);
}

export async function createLessonQuizQuestion(q: Omit<LessonQuizQuestion, "id">): Promise<LessonQuizQuestion | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("lesson_quiz_questions").insert(q).select().single();
  if (error) { console.error("[Supabase] createLessonQuizQuestion:", error.message); return null; }
  return data;
}

export async function toggleLessonPublish(lessonId: string, isPublished: boolean): Promise<LessonPlan | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("lesson_plans").update({ is_published: isPublished }).eq("id", lessonId).select().single();
  if (error) { console.error("[Supabase] toggleLessonPublish:", error.message); return null; }
  return normalizeLessonPlan(data);
}

export async function getStudentOrgIds(studentUserId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("org_students").select("org_id").eq("student_user_id", studentUserId);
  if (error) return [];
  return (data ?? []).map((r: any) => r.org_id);
}

function normalizeLessonPlan(raw: any): LessonPlan {
  return {
    ...raw,
    objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
    content_sections: Array.isArray(raw.content_sections) ? raw.content_sections : [],
  };
}

// ─── Seed: The Financial Academy — Needs & Wants lesson ───────────────────────

export async function seedFinancialAcademyLesson(): Promise<void> {
  if (!supabase) return;
  try {
    const org = await getOrganizationByName("The Financial Academy");
    if (!org) {
      console.log("[Supabase] Seed: 'The Financial Academy' org not found — skipping lesson seed.");
      return;
    }

    const { data: existing } = await supabase
      .from("lesson_plans")
      .select("id")
      .eq("org_id", org.id)
      .eq("title", "Needs and Wants")
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("[Supabase] Seed: Financial Academy lesson already exists — skipping.");
      return;
    }

    const lesson = await createLessonPlan({
      org_id: org.id,
      env_id: null,
      title: "Needs and Wants",
      instructor: "Mrs. L. Deveaux",
      subject: "Personal Finance",
      grade_level: "5/6",
      topic: "Needs and Wants",
      duration: "45 minutes (Period 7)",
      objectives: [
        "I can define needs.",
        "I can provide examples of at least 3 needs.",
        "I can define wants.",
        "I can provide examples of at least 3 wants.",
      ],
      content_sections: [
        {
          heading: "What is a Need?",
          body: "A need is something you must have to survive and live safely.",
          examples: ["Food", "Water", "Shelter", "Clothing"],
        },
        {
          heading: "What is a Want?",
          body: "A want is something you would like to have but can live without.",
          examples: ["Video games", "Designer sneakers", "The newest phone", "Jewellery"],
        },
      ],
      is_published: true,
    });

    if (!lesson) {
      console.error("[Supabase] Seed: Failed to create Financial Academy lesson.");
      return;
    }

    const questions: Omit<LessonQuizQuestion, "id">[] = [
      {
        lesson_id: lesson.id,
        question: "What is a need?",
        option_a: "Something you must have to live",
        option_b: "A toy you like",
        option_c: "A video game",
        option_d: "A piece of candy",
        correct_answer: "A",
        order_index: 0,
      },
      {
        lesson_id: lesson.id,
        question: "Which of these is NOT a need?",
        option_a: "Food",
        option_b: "Shelter",
        option_c: "Designer sneakers",
        option_d: "Clothing",
        correct_answer: "C",
        order_index: 1,
      },
      {
        lesson_id: lesson.id,
        question: "Which group shows only wants?",
        option_a: "Air, water, food",
        option_b: "Shoes, uniform, lunch",
        option_c: "Video game, doll, skateboard",
        option_d: "Jacket, house, water",
        correct_answer: "C",
        order_index: 2,
      },
      {
        lesson_id: lesson.id,
        question: "Which of the following is a need?",
        option_a: "Ice cream",
        option_b: "Clean water",
        option_c: "A new phone",
        option_d: "A skateboard",
        correct_answer: "B",
        order_index: 3,
      },
      {
        lesson_id: lesson.id,
        question: "What is a want?",
        option_a: "Something you must have to survive",
        option_b: "Something that keeps you safe",
        option_c: "Something nice to have but not necessary",
        option_d: "Something you cannot live without",
        correct_answer: "C",
        order_index: 4,
      },
      {
        lesson_id: lesson.id,
        question: "Which group shows only needs?",
        option_a: "Pizza, candy, chips",
        option_b: "House, food, water",
        option_c: "Bike, toy, tablet",
        option_d: "Ice cream, cake, soda",
        correct_answer: "B",
        order_index: 5,
      },
    ];

    for (const q of questions) {
      await createLessonQuizQuestion(q);
    }

    console.log("[Supabase] ✓ Seeded Financial Academy 'Needs and Wants' lesson.");
  } catch (e: any) {
    console.error("[Supabase] Seed error:", e.message);
  }
}
