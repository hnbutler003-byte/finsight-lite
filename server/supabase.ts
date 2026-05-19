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
  logo_url?: string | null;
  signature_left_name?: string | null;
  signature_left_role?: string | null;
  signature_right_name?: string | null;
  signature_right_role?: string | null;
  allowed_email_domains?: string[] | null;
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
  video_url?: string | null;
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

-- Add video_url column to lesson_plans (run if not already added)
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS video_url text;

-- Add certificate branding columns to organizations (Task #16)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_left_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_left_role text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_right_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_right_role text;

-- Add Google SSO domain allowlist (Task #29)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS allowed_email_domains text[];
`;

async function applyBrandingColumnsViaPg(): Promise<boolean> {
  const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return false;
  try {
    const { Client } = await import("pg");
    const client = new Client({
      connectionString: url,
      ssl: url.includes("supabase.") ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    try {
      await client.query(`
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_left_name text;
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_left_role text;
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_right_name text;
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_right_role text;
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS allowed_email_domains text[];
      `);
      return true;
    } finally {
      await client.end().catch(() => {});
    }
  } catch (e: any) {
    console.warn("[Supabase] Auto-migrate failed:", e?.message ?? e);
    return false;
  }
}

export async function initSupabaseTables(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("organizations").select("id").limit(1);
  if (!error) {
    console.log("[Supabase] ✓ Connected — tables verified.");
    // Verify Task #16 branding columns exist; auto-apply if a direct DB URL is configured
    const probe = await supabase.from("organizations").select("signature_left_name").limit(1);
    if (probe.error && (probe.error.code === "42703" || probe.error.message?.includes("signature_left_name"))) {
      const applied = await applyBrandingColumnsViaPg();
      if (applied) {
        console.log("[Supabase] ✓ Applied certificate branding columns on organizations.");
      } else {
        console.warn("[Supabase] ⚠ Missing certificate branding columns on organizations. Run:\n" +
          "  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_left_name text;\n" +
          "  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_left_role text;\n" +
          "  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_right_name text;\n" +
          "  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_right_role text;");
      }
    }
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
  const { cacheGet, cacheSet } = await import("./cache");
  const key = `org:${id}`;
  const hit = cacheGet<Organization>(key);
  if (hit) return hit;
  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single();
  // Don't cache transient errors / missing rows — retry on next request instead of
  // serving stale "not found" for the full TTL.
  if (error || !data) return null;
  cacheSet(key, data as Organization, 5 * 60_000);
  return data as Organization;
}

export async function invalidateOrganizationCache(id?: string): Promise<void> {
  const { cacheInvalidate } = await import("./cache");
  cacheInvalidate(id ? `org:${id}` : "org:");
}

export async function getOrganizationByName(name: string): Promise<Organization | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("organizations").select("*").eq("name", name.trim()).limit(1).single();
  if (error) return null;
  return data;
}

export async function createOrganization(org: Omit<Organization, "id" | "created_at">): Promise<Organization | null> {
  if (!supabase) return null;
  const payload = { ...org, name: org.name?.trim() ?? org.name };
  const { data, error } = await supabase.from("organizations").insert(payload).select().single();
  if (error) { console.error("[Supabase] createOrganization:", error.message); return null; }
  return data;
}

export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null> {
  if (!supabase) return null;
  const payload = typeof updates.name === "string" ? { ...updates, name: updates.name.trim() } : updates;
  const { data, error } = await supabase.from("organizations").update(payload).eq("id", id).select().single();
  if (error) { console.error("[Supabase] updateOrganization:", error.message); return null; }
  return data;
}

// ─── Startup: trim org names that have leading/trailing whitespace ─────────────
// Fixes any existing records (e.g. "The Financial Academy ") created before the
// trim was enforced on save, so that name-exact-match lookups work correctly.
export async function trimOrgNamesInSupabase(): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from("organizations").select("id,name");
    if (error || !data) return;
    const dirty = data.filter((o: { id: string; name: string }) => o.name !== o.name.trim());
    if (dirty.length === 0) return;
    await Promise.all(
      dirty.map((o: { id: string; name: string }) =>
        supabase!.from("organizations").update({ name: o.name.trim() }).eq("id", o.id)
      )
    );
    console.log(`[Supabase] ✓ Trimmed org names for ${dirty.length} record(s):`, dirty.map((o: { id: string; name: string }) => JSON.stringify(o.name)));
  } catch (e: any) {
    console.error("[Supabase] trimOrgNamesInSupabase error:", e.message);
  }
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

export async function updateLessonPlan(lessonId: string, updates: Partial<Omit<LessonPlan, "id" | "org_id" | "created_at">>): Promise<LessonPlan | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("lesson_plans").update(updates).eq("id", lessonId).select().single();
  if (error) { console.error("[Supabase] updateLessonPlan:", error.message); return null; }
  return normalizeLessonPlan(data);
}

export async function deleteQuizQuestionsForLesson(lessonId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("lesson_quiz_questions").delete().eq("lesson_id", lessonId);
  if (error) console.error("[Supabase] deleteQuizQuestionsForLesson:", error.message);
}

export async function deleteLessonPlan(lessonId: string): Promise<boolean> {
  if (!supabase) return false;
  await supabase.from("lesson_quiz_questions").delete().eq("lesson_id", lessonId);
  const { error } = await supabase.from("lesson_plans").delete().eq("id", lessonId);
  if (error) { console.error("[Supabase] deleteLessonPlan:", error.message); return false; }
  return true;
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

// ─── Static Content: Tables, Seed & Getters ───────────────────────────────────

export const STATIC_ORG_ID = "00000000-0000-0000-0000-000000000001";

export type StaticModuleRow = {
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  display_order: number;
};

export type StaticLessonRow = {
  id: string;
  static_lesson_id: string;
  title: string;
  description: string;
  duration: string | null;
  video_url: string | null;
  objectives: string[];
  content_sections: ContentSection[];
  questions: LessonQuizQuestion[];
};

export type StaticModuleWithLessons = StaticModuleRow & { lessons: StaticLessonRow[] };

export type RegionRecord = {
  region_code: string; country: string; currency: string; currency_code: string; symbol: string;
  main_bank: string; exchange_name: string; exchange_abbr: string;
  example_company1: string; example_company1_ticker: string; example_company1_desc: string;
  example_company2: string; example_company2_ticker: string; example_company2_desc: string;
  central_bank: string; bond_name: string; bond_rate: string; pegged: boolean; peg_note: string;
};

async function applyStaticContentTablesViaPg(): Promise<void> {
  const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return;
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: url, ssl: url.includes("supabase.") ? { rejectUnauthorized: false } : undefined });
    await client.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS static_modules (
          id text PRIMARY KEY, title text NOT NULL, subtitle text NOT NULL,
          objective text NOT NULL, display_order integer NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS regional_content (
          region_code text PRIMARY KEY, country text NOT NULL, currency text NOT NULL,
          currency_code text NOT NULL, symbol text NOT NULL, main_bank text NOT NULL,
          exchange_name text NOT NULL, exchange_abbr text NOT NULL,
          example_company1 text NOT NULL, example_company1_ticker text NOT NULL, example_company1_desc text NOT NULL,
          example_company2 text NOT NULL, example_company2_ticker text NOT NULL, example_company2_desc text NOT NULL,
          central_bank text NOT NULL, bond_name text NOT NULL, bond_rate text NOT NULL,
          pegged boolean NOT NULL DEFAULT false, peg_note text NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS game_content (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          game_id text NOT NULL, item_type text NOT NULL DEFAULT 'item',
          payload jsonb NOT NULL, display_order integer NOT NULL DEFAULT 0,
          UNIQUE(game_id, item_type, display_order)
        );
      `);
      console.log("[Supabase] ✓ Static content tables verified/created.");
    } finally { await client.end().catch(() => {}); }
  } catch (e: any) { console.warn("[Supabase] applyStaticContentTablesViaPg:", e?.message ?? e); }
}

export async function initStaticContentTables(): Promise<void> {
  await applyStaticContentTablesViaPg();
}

async function seedStaticOrg(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("organizations").upsert(
    { id: STATIC_ORG_ID, name: "FinSight Built-in", type: "school", country: "Caribbean", is_active: true, subscription_tier: "free", max_students: 0 },
    { onConflict: "id" }
  );
  if (error && !error.message.includes("already exists")) console.warn("[Supabase] seedStaticOrg:", error.message);
}

// ─── Static module & lesson seed data ─────────────────────────────────────────

const STATIC_MODULES_DATA = [
  { id: "budgeting", title: "Budgeting Basics", subtitle: "Plan & Manage Money", objective: "Students will learn how to plan and manage their money by distinguishing needs from wants, building simple budgets, and tracking their spending.", display_order: 0 },
  { id: "saving",    title: "Saving Smart",       subtitle: "Build Your Future",   objective: "Students will understand why saving is essential, how to set meaningful savings goals, and the strategy of paying yourself first to build lasting financial security.", display_order: 1 },
  { id: "investing", title: "Investing Fundamentals", subtitle: "Grow Your Money", objective: "Students will understand what investing is, how risk relates to return, and how compound interest makes money grow exponentially over time.", display_order: 2 },
];

const STATIC_LESSONS_DATA: Array<{
  grade_level: string; topic: string; title: string; instructor: string;
  duration: string; video_url: string | null; objectives: string[]; content_sections: ContentSection[];
  questions: Omit<LessonQuizQuestion, "id" | "lesson_id">[];
}> = [
  {
    grade_level: "static-budget-1", topic: "budgeting", title: "Needs vs Wants",
    instructor: "Learn the critical difference between things you must have and things you'd like to have.",
    duration: "10 min", video_url: "https://youtu.be/2PX4-Y1zu2g?feature=shared",
    objectives: [
      "Distinguish between needs (food, shelter, clothing) and wants (entertainment, luxuries).",
      "Explain why prioritizing needs leads to better financial decisions.",
      "Give real-life examples of needs vs wants relevant to Caribbean teens.",
    ],
    content_sections: [
      { heading: "What Are Needs?", body: "Needs are things you must have to survive and function in daily life. These include food, clothing, shelter, healthcare, and transportation to work or school. Without meeting your needs, your health and wellbeing would be at serious risk. In The Bahamas and across the Caribbean, a 'need' for a student might be school supplies, bus fare, or meals — things without which you can't properly participate in daily life.", examples: ["Food & clean water", "Rent or housing", "School supplies", "Medical care", "Basic clothing", "Transport to school"] },
      { heading: "What Are Wants?", body: "Wants are things you would like to have but don't need to survive. They make life more enjoyable and comfortable but aren't essential. The latest smartphone, dining at a restaurant, a new gaming console, or designer sneakers are all wants. There is nothing wrong with having wants — the key is knowing they come after your needs are covered.", examples: ["New sneakers", "Streaming services", "Video games", "Eating out", "Brand-name clothing", "Latest phone"] },
      { heading: "Why This Matters for Budgeting", body: "Understanding the difference between needs and wants is the foundation of smart budgeting. When you separate your expenses into these two categories, you can make sure your needs are covered first, then decide how to spend what remains on wants. This prevents overspending on things you desire while struggling to pay for things you truly need. Many financial problems happen simply because people confuse the two.", examples: ["Pay rent before streaming", "Buy groceries before dining out", "Cover transport before new clothes"] },
    ],
    questions: [
      { order_index: 0, question: "Which of the following is a NEED?", option_a: "Video games", option_b: "Groceries and food", option_c: "Designer sneakers", option_d: "Movie tickets", correct_answer: "B" },
      { order_index: 1, question: "Which of the following is a WANT?", option_a: "Rent for your home", option_b: "Medicine when you are sick", option_c: "A new pair of name-brand sneakers", option_d: "Bus fare to school", correct_answer: "C" },
      { order_index: 2, question: "Why should you prioritize needs over wants in a budget?", option_a: "Wants are always more expensive", option_b: "Needs are required for survival and wellbeing", option_c: "Wants are always free", option_d: "Needs are less important than wants", correct_answer: "B" },
      { order_index: 3, question: "You have $50 left this week. What should come first?", option_a: "Buying a new video game", option_b: "Going to the movies with friends", option_c: "Paying for groceries and bus fare", option_d: "Buying a new outfit", correct_answer: "C" },
    ],
  },
  {
    grade_level: "static-budget-2", topic: "budgeting", title: "Creating a Simple Budget",
    instructor: "Build your first monthly budget using the popular 50/30/20 rule.",
    duration: "12 min", video_url: null,
    objectives: [
      "Apply the 50/30/20 budgeting rule to real-life income scenarios.",
      "List all income sources and all monthly expenses accurately.",
      "Create a balanced budget that covers needs, wants, and savings.",
    ],
    content_sections: [
      { heading: "The 50/30/20 Rule", body: "A simple and powerful budgeting framework: allocate 50% of your income to needs, 30% to wants, and 20% to savings. For example, if your monthly allowance or earnings are $100, then $50 goes to needs (food, transport), $30 to wants (entertainment, hobbies), and $20 to savings. This rule keeps your finances balanced without needing complex spreadsheets.", examples: ["50% needs: food, rent, transport", "30% wants: fun, dining out, clothes", "20% savings: future goals, emergencies"] },
      { heading: "Step 1 — List Your Income", body: "Write down every source of money you receive each month. This includes your allowance, part-time job earnings, gifts, or any side income. Be honest and realistic — only include money you actually receive, not money you hope to get. Your total income is the foundation of your budget.", examples: ["Weekly allowance", "Birthday money", "Part-time job", "Selling items", "Babysitting or odd jobs"] },
      { heading: "Step 2 — List Your Expenses", body: "Track everything you spend money on in a typical month. Separate them into needs and wants. Then compare your total expenses to your total income. If your expenses are higher than your income, you need to cut something — usually from wants, never from needs. A good budget is one where income >= expenses + savings.", examples: ["School fees", "Bus fare", "Lunch money", "Phone credit", "Entertainment"] },
    ],
    questions: [
      { order_index: 0, question: "In the 50/30/20 budgeting rule, what percentage goes to NEEDS?", option_a: "20%", option_b: "30%", option_c: "50%", option_d: "80%", correct_answer: "C" },
      { order_index: 1, question: "What is the FIRST step in creating a budget?", option_a: "Go shopping for what you need", option_b: "Calculate your total monthly income", option_c: "Open a bank account", option_d: "Ask your parents for money", correct_answer: "B" },
      { order_index: 2, question: "If you earn $300/month and use the 50/30/20 rule, how much goes to savings?", option_a: "$50", option_b: "$60", option_c: "$90", option_d: "$150", correct_answer: "B" },
      { order_index: 3, question: "Your expenses are more than your income. What should you cut first?", option_a: "Food and transport", option_b: "School fees", option_c: "Entertainment and dining out", option_d: "Medical expenses", correct_answer: "C" },
    ],
  },
  {
    grade_level: "static-budget-3", topic: "budgeting", title: "Tracking Your Spending",
    instructor: "Discover how monitoring every dollar reveals patterns and helps you stay on budget.",
    duration: "8 min", video_url: null,
    objectives: [
      "Explain why tracking spending is essential to staying within a budget.",
      "Record daily transactions accurately by date, item, and amount.",
      "Review weekly spending to identify areas for improvement.",
    ],
    content_sections: [
      { heading: "Why Track Your Spending?", body: "When you track where your money goes, you can see if you're sticking to your budget. Many people are surprised to find they spend far more than they thought on small items — a cold drink here, a snack there. These 'micro-expenses' add up fast. Without tracking, it's impossible to know whether you're on budget or slipping into overspending.", examples: ["$2 snacks daily = $60/month", "$5 phone credit weekly = $20/month", "Unplanned shopping trips"] },
      { heading: "How to Track — Simple Methods", body: "You don't need fancy apps to track spending. A small notebook works perfectly. After every purchase, write down: the date, what you bought, and how much it cost. Categorize it as a need or want. Review it at the end of the week. Apps like FinSight Lite can automate this for you — simply log each transaction and let the dashboard show your patterns.", examples: ["Notebook or journal", "Spreadsheet on phone", "FinSight Lite transactions", "Envelope budgeting method"] },
      { heading: "Weekly Review — Stay in Control", body: "Set aside 10 minutes at the end of each week to review your spending. Ask yourself: Did I stay within my budget? Did I spend on wants before covering needs? Were there any unexpected expenses? This weekly habit builds financial awareness and lets you adjust before small overspending becomes a big problem. It's the habit that separates people who reach financial goals from those who don't." },
    ],
    questions: [
      { order_index: 0, question: "Why is tracking your spending important?", option_a: "To impress your friends", option_b: "To know if you are sticking to your budget", option_c: "To spend more money", option_d: "Only adults need to track spending", correct_answer: "B" },
      { order_index: 1, question: "You buy a $2 snack every day. How much do you spend in one month (30 days)?", option_a: "$20", option_b: "$40", option_c: "$60", option_d: "$80", correct_answer: "C" },
      { order_index: 2, question: "When should you review your spending?", option_a: "Once a year", option_b: "Only when you run out of money", option_c: "Weekly, to catch problems early", option_d: "Never — it causes stress", correct_answer: "C" },
      { order_index: 3, question: "Which tool can help you track your spending automatically?", option_a: "A dictionary", option_b: "FinSight Lite's transaction log", option_c: "A calculator alone", option_d: "Social media", correct_answer: "B" },
    ],
  },
  {
    grade_level: "static-save-1", topic: "saving", title: "Why Save Money?",
    instructor: "Explore why saving is the cornerstone of financial wellbeing and long-term security.",
    duration: "8 min", video_url: null,
    objectives: [
      "Explain at least three reasons why saving money is important.",
      "Describe the concept of an emergency fund and why it matters.",
      "Connect saving habits today to financial freedom in the future.",
    ],
    content_sections: [
      { heading: "Saving Creates a Safety Net", body: "Life is unpredictable. Cars break down, phones get stolen, people get sick. Without savings, unexpected events force you to borrow money — which often comes with interest and puts you in debt. An emergency fund of even 1-3 months of expenses can protect you from financial crises. In the Caribbean, where hurricanes and natural events can disrupt income, savings are even more critical.", examples: ["Phone replacement fund", "Medical emergency buffer", "Hurricane season preparedness", "Job loss cushion"] },
      { heading: "Saving Builds Financial Freedom", body: "Every dollar you save is a dollar that can work for you in the future. When you save consistently, you create options: you can afford education, start a business, travel, or simply live without financial stress. People who save regularly are less likely to need loans for everyday purchases and more likely to achieve big life goals. Financial freedom doesn't happen overnight — it's built one saved dollar at a time.", examples: ["University tuition fund", "Business startup money", "House deposit savings", "Retirement fund"] },
      { heading: "Small Savings Add Up Faster Than You Think", body: "You don't need to save large amounts to make a difference. Saving just $5 per week adds up to $260 per year. If you start saving $20 per month at age 13, you'll have $840 by the time you're 17 — without counting any interest earned. The habit of saving is more important than the amount. Start small, start now, and increase as your income grows.", examples: ["$5/week = $260/year", "$20/month = $240/year", "$1/day = $365/year"] },
    ],
    questions: [
      { order_index: 0, question: "What is an emergency fund?", option_a: "Money set aside for vacations", option_b: "Savings to cover unexpected expenses or crises", option_c: "Money you invest in stocks", option_d: "A loan from the bank", correct_answer: "B" },
      { order_index: 1, question: "If you save $5 every week, how much will you have after one year?", option_a: "$100", option_b: "$180", option_c: "$260", option_d: "$360", correct_answer: "C" },
      { order_index: 2, question: "Why is saving especially important in the Caribbean?", option_a: "Caribbean banks pay higher interest", option_b: "Natural events like hurricanes can disrupt income unexpectedly", option_c: "Caribbean people earn more money", option_d: "It is not especially important there", correct_answer: "B" },
      { order_index: 3, question: "Which of these is a benefit of saving money?", option_a: "You spend more on wants", option_b: "You go into more debt", option_c: "You create future options and financial freedom", option_d: "You avoid paying taxes", correct_answer: "C" },
    ],
  },
  {
    grade_level: "static-save-2", topic: "saving", title: "Setting Savings Goals",
    instructor: "Learn how SMART goals turn vague wishes into achievable financial targets.",
    duration: "10 min", video_url: null,
    objectives: [
      "Define a SMART savings goal (Specific, Measurable, Achievable, Relevant, Time-bound).",
      "Distinguish between short-term and long-term savings goals.",
      "Create a personal savings plan with a clear target and timeline.",
    ],
    content_sections: [
      { heading: "SMART Goals — Make Saving Purposeful", body: "A savings goal without a plan is just a wish. SMART goals transform vague intentions into concrete targets. SMART stands for: Specific (I want to save $300 for a bicycle), Measurable (track progress weekly), Achievable (save $25/month), Relevant (I need transport to school), and Time-bound (in 12 months). When your goal is SMART, you always know exactly how you're doing and when you'll reach it.", examples: ["'Save $300 for a bicycle in 12 months'", "'Save $500 for school fees by September'", "'Save $50 emergency fund in 3 months'"] },
      { heading: "Short-Term vs Long-Term Goals", body: "Short-term goals are things you want to achieve within 1-12 months, like saving for a school trip, new shoes, or a phone. Long-term goals take more than a year, like saving for university, a car, or starting a small business. You can work on both types at the same time by splitting your savings: some into your short-term jar, some into your long-term fund. Balancing both builds discipline.", examples: ["Short-term: New headphones in 3 months", "Short-term: School trip deposit in 6 months", "Long-term: University fees", "Long-term: Business startup fund"] },
      { heading: "Breaking Goals Into Weekly Targets", body: "Once you have a goal, divide it into weekly or monthly targets. If you want to save $240 in 12 months, that's just $20 per month or $4.60 per week. Seeing it broken down makes it feel achievable. Use FinSight Lite's Savings Goals feature to set your target amount, track your progress, and celebrate milestones as you get closer.", examples: ["$240 goal / 12 = $20/month", "$500 goal / 52 = $9.60/week", "Celebrate 25%, 50%, 75% milestones"] },
    ],
    questions: [
      { order_index: 0, question: "What does 'SMART' stand for in goal-setting?", option_a: "Simple, Money, Achievable, Real, Time", option_b: "Specific, Measurable, Achievable, Relevant, Time-bound", option_c: "Savings, Money, Action, Result, Track", option_d: "Smart, Motivated, Aware, Ready, True", correct_answer: "B" },
      { order_index: 1, question: "Which is a better savings goal?", option_a: "'Save money someday'", option_b: "'Save more next month'", option_c: "'Save $300 for school supplies by August 1st'", option_d: "'Try to spend less'", correct_answer: "C" },
      { order_index: 2, question: "You want to save $240 in 12 months. How much do you need to save per month?", option_a: "$10", option_b: "$20", option_c: "$30", option_d: "$40", correct_answer: "B" },
      { order_index: 3, question: "Which of these is a LONG-TERM savings goal?", option_a: "Saving for new headphones this month", option_b: "Saving for a school trip next term", option_c: "Saving for university tuition in 5 years", option_d: "Saving for lunch this week", correct_answer: "C" },
    ],
  },
  {
    grade_level: "static-save-3", topic: "saving", title: "Pay Yourself First",
    instructor: "Master the most powerful savings habit: setting aside savings before spending on anything else.",
    duration: "8 min", video_url: null,
    objectives: [
      "Understand the 'Pay Yourself First' principle and why it works.",
      "Automate savings by treating them as a fixed, non-negotiable expense.",
      "Explain how this strategy prevents overspending and builds wealth consistently.",
    ],
    content_sections: [
      { heading: "What Is 'Pay Yourself First'?", body: "Most people spend first and save whatever's left — which is usually nothing. 'Pay Yourself First' flips this: the moment you receive money (allowance, wages, gifts), you immediately move your savings portion aside before you spend a single dollar on anything else. Think of savings as a bill you must pay to your future self. It comes before food, before fun, before everything else.", examples: ["Receive $100 => immediately move $20 to savings => spend remaining $80", "Treat savings like rent — non-negotiable"] },
      { heading: "Why It Works — Behavioural Science", body: "Humans naturally spend what's available. If you see $100, you'll find $100 worth of things to buy. But if you only see $80 (because $20 is already in savings), you'll adjust your spending to fit $80. This is called 'mental accounting.' By removing savings before it enters your spending wallet, you eliminate the temptation to spend it. You adapt to the smaller amount naturally.", examples: ["Out of sight, out of mind savings", "Automatic transfers on paycheck day", "Savings envelope method"] },
      { heading: "How to Automate It", body: "The most powerful version of this strategy is automation. If your school bank account or piggy bank has two compartments, put your savings portion in immediately. Better yet, if you have a bank account, set up an automatic transfer on the day you receive income. You never see the money, so you can't spend it. Even saving 10% consistently every time builds substantial wealth over years.", examples: ["Separate savings jar or envelope", "Two-compartment piggy bank", "Automatic bank transfer on payday", "Save at least 10% of every payment"] },
    ],
    questions: [
      { order_index: 0, question: "What does 'Pay Yourself First' mean?", option_a: "Buy things you want before paying bills", option_b: "Save a portion of your money BEFORE spending on anything else", option_c: "Pay your friends back first", option_d: "Spend all your money and save the rest", correct_answer: "B" },
      { order_index: 1, question: "You receive $200 in allowance. Using Pay Yourself First, you save 10%. How much do you save?", option_a: "$10", option_b: "$20", option_c: "$50", option_d: "$100", correct_answer: "B" },
      { order_index: 2, question: "Why does Pay Yourself First work so well?", option_a: "It makes you earn more money", option_b: "Humans naturally adapt to spending what's available after savings are removed", option_c: "It removes the need for a budget", option_d: "It only works for adults", correct_answer: "B" },
      { order_index: 3, question: "What is the best way to automate the Pay Yourself First strategy?", option_a: "Hope you remember to save each month", option_b: "Spend first and save the rest", option_c: "Set up an automatic transfer to savings on income day", option_d: "Ask a friend to hold your money", correct_answer: "C" },
    ],
  },
  {
    grade_level: "static-invest-1", topic: "investing", title: "What Is Investing?",
    instructor: "Discover how putting money to work in stocks, bonds, and more builds wealth over time.",
    duration: "10 min", video_url: null,
    objectives: [
      "Define investing and explain how it differs from saving.",
      "Identify common types of investments: stocks, bonds, and mutual funds.",
      "Explain why starting to invest young gives a major advantage.",
    ],
    content_sections: [
      { heading: "Saving vs Investing — Key Difference", body: "Saving means keeping money safe (usually in a bank) for short-term goals or emergencies — it grows slowly with low interest. Investing means putting money into assets (like stocks or real estate) with the expectation of earning a larger return over time. Investing involves more risk than saving, but it also offers much higher potential growth. For long-term goals (5+ years), investing is typically far more powerful than saving alone.", examples: ["Savings account: ~1-3% interest per year", "Stock market: historical ~7-10% average return per year", "Real estate: long-term appreciation"] },
      { heading: "Types of Investments", body: "Stocks are shares of ownership in a company — when the company grows, your share is worth more. Bonds are loans you give to governments or companies, which pay you back with fixed interest. Mutual funds pool money from many investors to buy a diversified mix of stocks and bonds, reducing risk. Exchange-Traded Funds (ETFs) work similarly to mutual funds but are traded on stock exchanges like individual stocks.", examples: ["Stocks: owning a piece of a company", "Government bonds: lending to the government", "Mutual funds: pooled diversified investing", "ETFs: low-cost index investing"] },
      { heading: "Why Starting Young Is a Superpower", body: "The earlier you start investing, the more time your money has to grow. A 15-year-old who invests $100/month until age 65 will accumulate far more than a 35-year-old investing $500/month for the same period — because of compound growth. Time in the market matters more than the amount you invest. Even small amounts invested in your teens can become significant wealth by adulthood.", examples: ["$100/month from age 15 = massive wealth at 65", "Starting 10 years earlier doubles final wealth", "Use FinSight's Investment Simulator to explore this"] },
    ],
    questions: [
      { order_index: 0, question: "What is the main difference between saving and investing?", option_a: "Saving earns more money than investing", option_b: "Investing involves more risk but offers higher potential growth", option_c: "Investing is only for adults", option_d: "Saving and investing are the same thing", correct_answer: "B" },
      { order_index: 1, question: "What is a stock?", option_a: "A type of bank account", option_b: "A loan you give to the government", option_c: "A share of ownership in a company", option_d: "A savings certificate", correct_answer: "C" },
      { order_index: 2, question: "What is a bond?", option_a: "A share of a company you own", option_b: "A loan you give to a government or company that pays you back with interest", option_c: "A type of stock", option_d: "A piggy bank for kids", correct_answer: "B" },
      { order_index: 3, question: "Why is starting to invest early so important?", option_a: "Young people get better interest rates", option_b: "Investing is easier when you are young", option_c: "More time allows compound growth to multiply wealth significantly", option_d: "Early investors pay less tax", correct_answer: "C" },
    ],
  },
  {
    grade_level: "static-invest-2", topic: "investing", title: "Risk & Return",
    instructor: "Understand how risk and potential reward are connected in every investment decision.",
    duration: "10 min", video_url: null,
    objectives: [
      "Define investment risk and explain why it cannot be entirely avoided.",
      "Describe the relationship between risk and potential return.",
      "Use diversification as a strategy to manage risk.",
    ],
    content_sections: [
      { heading: "What Is Investment Risk?", body: "Investment risk is the possibility that an investment will lose value or not perform as expected. Every investment carries some risk — even keeping money in cash carries the risk of inflation (money losing purchasing power over time). Risk cannot be completely eliminated, but it can be managed. Understanding and accepting risk is an essential part of becoming a smart investor.", examples: ["Stock price falling after you buy", "A company going bankrupt", "Inflation reducing purchasing power", "Currency value changing"] },
      { heading: "The Risk-Return Tradeoff", body: "In investing, there is a fundamental rule: higher potential return comes with higher risk, and lower risk comes with lower return. A savings account is very safe (low risk) but earns very little interest (low return). Stocks of a new startup company could double in value (high return) but could also become worthless (high risk). Understanding this tradeoff helps you choose investments that match your goals and how much risk you can comfortably handle.", examples: ["Low risk => Low return: savings account, government bonds", "Medium risk => Medium return: blue-chip stocks, ETFs", "High risk => High return: startup stocks, crypto"] },
      { heading: "Diversification — Don't Put All Your Eggs in One Basket", body: "Diversification means spreading your money across different types of investments so that if one performs badly, others may compensate. If you invest all your money in one company and it fails, you lose everything. But if you invest across 20 companies in different industries, one failure won't destroy your portfolio. Mutual funds and ETFs are already diversified by design — one of the reasons they're recommended for beginner investors.", examples: ["Mix stocks, bonds, and savings", "Invest in different industries", "Use ETFs for instant diversification", "Never put all money in one investment"] },
    ],
    questions: [
      { order_index: 0, question: "What is investment risk?", option_a: "The fee you pay to a bank", option_b: "The possibility that an investment loses value or underperforms", option_c: "The interest you earn on savings", option_d: "The time it takes to invest", correct_answer: "B" },
      { order_index: 1, question: "What is the risk-return tradeoff?", option_a: "Higher risk always leads to guaranteed high returns", option_b: "Lower risk investments offer higher returns than risky ones", option_c: "Higher potential return typically comes with higher risk", option_d: "Risk and return are not related", correct_answer: "C" },
      { order_index: 2, question: "What is diversification?", option_a: "Investing all your money in one winning stock", option_b: "Spreading investments across different types to reduce overall risk", option_c: "Saving in multiple bank accounts", option_d: "Only investing in government bonds", correct_answer: "B" },
      { order_index: 3, question: "Which type of investment generally has the LOWEST risk?", option_a: "Startup company stocks", option_b: "Cryptocurrency", option_c: "Government bonds and savings accounts", option_d: "Individual company stocks", correct_answer: "C" },
    ],
  },
  {
    grade_level: "static-invest-3", topic: "investing", title: "The Power of Compound Interest",
    instructor: "See how 'interest on interest' turns small investments into life-changing wealth over time.",
    duration: "12 min", video_url: null,
    objectives: [
      "Define compound interest and explain how it differs from simple interest.",
      "Calculate the effect of compound interest over time using real examples.",
      "Articulate why compound interest is called the eighth wonder of the world.",
    ],
    content_sections: [
      { heading: "Simple Interest vs Compound Interest", body: "Simple interest is calculated only on your original amount (principal). If you invest $1,000 at 10% simple interest, you earn $100 every year, forever. Compound interest is interest calculated on both your original investment AND all the interest you've already earned. In year 1, you earn $100. In year 2, you earn 10% of $1,100 = $110. In year 3, you earn 10% of $1,210 = $121. The interest keeps growing because your base keeps growing.", examples: ["Simple: $1,000 x 10% = $100/year always", "Compound Year 1: $1,000 => $1,100", "Compound Year 2: $1,100 => $1,210", "Compound Year 10: $1,000 => $2,594"] },
      { heading: "The Eighth Wonder of the World", body: "Albert Einstein is said to have called compound interest 'the eighth wonder of the world — he who understands it, earns it; he who doesn't, pays it.' The key insight is that compound growth is exponential, not linear. Early years show slow growth, but later years show explosive acceleration. A $1,000 investment at 8% annual return becomes $2,159 after 10 years, $4,661 after 20 years, and $10,063 after 30 years — without adding any extra money.", examples: ["$1,000 at 8%: $2,159 after 10 years", "$1,000 at 8%: $4,661 after 20 years", "$1,000 at 8%: $10,063 after 30 years"] },
      { heading: "Start Early — Time Is Your Greatest Asset", body: "Two friends: Maya starts investing $50/month at age 15 and stops at age 25 (10 years, $6,000 invested). Jordan starts at age 25 and invests $50/month until age 65 (40 years, $24,000 invested). At age 65, assuming 8% return, Maya has more money than Jordan — despite investing 4x less! This is the power of starting early. Every year you delay costs you enormously in future wealth.", examples: ["Maya (start age 15): $6,000 invested => larger final amount", "Jordan (start age 25): $24,000 invested => smaller final amount", "Time beats money invested"] },
    ],
    questions: [
      { order_index: 0, question: "What is compound interest?", option_a: "Interest paid only on the original investment", option_b: "A fee charged by banks for using their services", option_c: "Interest calculated on both the principal and accumulated interest", option_d: "A fixed amount added each year", correct_answer: "C" },
      { order_index: 1, question: "You invest $500 at 10% compound interest. After year 1 you have $550. How much do you have after year 2?", option_a: "$600", option_b: "$605", option_c: "$620", option_d: "$650", correct_answer: "B" },
      { order_index: 2, question: "Why is starting to invest early so powerful with compound interest?", option_a: "Young investors pay less taxes", option_b: "More time allows interest to compound on itself many more times", option_c: "Early investors get higher interest rates", option_d: "Compound interest only works for young people", correct_answer: "B" },
      { order_index: 3, question: "Who famously called compound interest 'the eighth wonder of the world'?", option_a: "Warren Buffett", option_b: "Isaac Newton", option_c: "Albert Einstein", option_d: "Benjamin Franklin", correct_answer: "C" },
    ],
  },
];

// ─── Regional content seed data ────────────────────────────────────────────────

const REGIONAL_CONTENT_DATA: RegionRecord[] = [
  { region_code: "BSD", country: "The Bahamas", currency: "Bahamian Dollar", currency_code: "BSD", symbol: "B$", main_bank: "Commonwealth Bank", exchange_name: "Bahamas International Securities Exchange", exchange_abbr: "BISX", example_company1: "Focol Holdings", example_company1_ticker: "FCL", example_company1_desc: "distributes fuel across The Bahamas", example_company2: "Cable Bahamas", example_company2_ticker: "CAB", example_company2_desc: "provides cable TV, internet, and phone services", central_bank: "Central Bank of The Bahamas", bond_name: "Bahamas Government Registered Stock", bond_rate: "4.5%", pegged: true, peg_note: "The Bahamian Dollar is pegged (locked) 1:1 to the US Dollar, so the exchange rate stays the same." },
  { region_code: "BBD", country: "Barbados", currency: "Barbadian Dollar", currency_code: "BBD", symbol: "Bds$", main_bank: "Republic Bank Barbados", exchange_name: "Barbados Stock Exchange", exchange_abbr: "BSE", example_company1: "Barbados Shipping & Trading", example_company1_ticker: "BST", example_company1_desc: "handles imports and retail across Barbados", example_company2: "Goddard Enterprises", example_company2_ticker: "GEL", example_company2_desc: "operates in food, manufacturing, and aviation services", central_bank: "Central Bank of Barbados", bond_name: "Barbados Government Savings Bonds", bond_rate: "5.0%", pegged: true, peg_note: "The Barbadian Dollar is pegged at 2 BBD to 1 US Dollar, keeping the exchange rate stable." },
  { region_code: "JMD", country: "Jamaica", currency: "Jamaican Dollar", currency_code: "JMD", symbol: "J$", main_bank: "National Commercial Bank Jamaica", exchange_name: "Jamaica Stock Exchange", exchange_abbr: "JSE", example_company1: "GraceKennedy", example_company1_ticker: "GK", example_company1_desc: "is a major food and financial services company across the Caribbean", example_company2: "Jamaica Producers Group", example_company2_ticker: "JP", example_company2_desc: "produces and exports food products, including bananas and juices", central_bank: "Bank of Jamaica", bond_name: "Bank of Jamaica Investment Notes", bond_rate: "6.0%", pegged: false, peg_note: "The Jamaican Dollar floats freely, meaning its value changes based on supply and demand in the market." },
  { region_code: "TTD", country: "Trinidad & Tobago", currency: "Trinidad & Tobago Dollar", currency_code: "TTD", symbol: "TT$", main_bank: "Republic Bank Trinidad", exchange_name: "Trinidad & Tobago Stock Exchange", exchange_abbr: "TTSE", example_company1: "Angostura Holdings", example_company1_ticker: "AHL", example_company1_desc: "produces the world-famous Angostura bitters and rum", example_company2: "National Flour Mills", example_company2_ticker: "NFM", example_company2_desc: "produces flour, animal feed, and other food products", central_bank: "Central Bank of Trinidad & Tobago", bond_name: "Trinidad & Tobago Government Bonds", bond_rate: "4.8%", pegged: false, peg_note: "The TT Dollar has a managed float, meaning the Central Bank influences its value but it can still shift." },
  { region_code: "XCD", country: "the Eastern Caribbean", currency: "East Caribbean Dollar", currency_code: "XCD", symbol: "EC$", main_bank: "Bank of Nevis", exchange_name: "Eastern Caribbean Securities Exchange", exchange_abbr: "ECSE", example_company1: "St. Kitts Nevis Anguilla National Bank", example_company1_ticker: "SKNB", example_company1_desc: "is one of the largest indigenous banks in the Eastern Caribbean", example_company2: "EC Home Mortgage Bank", example_company2_ticker: "ECHMB", example_company2_desc: "helps fund housing across the Eastern Caribbean islands", central_bank: "Eastern Caribbean Central Bank", bond_name: "ECCB Treasury Bills", bond_rate: "4.0%", pegged: true, peg_note: "The East Caribbean Dollar is pegged at 2.70 XCD to 1 US Dollar, keeping the rate stable across all member islands." },
  { region_code: "GYD", country: "Guyana", currency: "Guyanese Dollar", currency_code: "GYD", symbol: "G$", main_bank: "Demerara Bank", exchange_name: "Guyana Association of Securities Companies", exchange_abbr: "GASCI", example_company1: "Banks DIH", example_company1_ticker: "DIH", example_company1_desc: "produces beverages, food, and household products in Guyana", example_company2: "Demerara Distillers", example_company2_ticker: "DDL", example_company2_desc: "produces the famous El Dorado rum and other spirits", central_bank: "Bank of Guyana", bond_name: "Guyana Treasury Bills", bond_rate: "3.5%", pegged: false, peg_note: "The Guyanese Dollar floats, and its value has been strengthening recently due to the country's oil boom." },
];

export async function seedRegionalContent(): Promise<void> {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase.from("regional_content").select("region_code").limit(1);
    if (existing && existing.length > 0) { console.log("[Supabase] ✓ Regional content already seeded."); return; }
    for (const region of REGIONAL_CONTENT_DATA) {
      await supabase.from("regional_content").upsert(region, { onConflict: "region_code" });
    }
    console.log("[Supabase] ✓ Seeded regional content.");
  } catch (e: any) { console.error("[Supabase] seedRegionalContent:", e.message); }
}

// ─── Game content seed data ────────────────────────────────────────────────────

const GAME_CONTENT_DATA: Array<{ game_id: string; item_type: string; payload: Record<string, unknown>; display_order: number }> = [
  { game_id: "grocery", item_type: "item", payload: { name: "White Rice (5 lb)", price: 6.50, emoji: "🍚" }, display_order: 0 },
  { game_id: "grocery", item_type: "item", payload: { name: "Whole Wheat Bread", price: 4.25, emoji: "🍞" }, display_order: 1 },
  { game_id: "grocery", item_type: "item", payload: { name: "Chicken Thighs (3 lb)", price: 12.00, emoji: "🍗" }, display_order: 2 },
  { game_id: "grocery", item_type: "item", payload: { name: "Fresh Fish (1 lb)", price: 9.50, emoji: "🐟" }, display_order: 3 },
  { game_id: "grocery", item_type: "item", payload: { name: "Eggs (dozen)", price: 5.00, emoji: "🥚" }, display_order: 4 },
  { game_id: "grocery", item_type: "item", payload: { name: "Milk (1 gal)", price: 6.75, emoji: "🥛" }, display_order: 5 },
  { game_id: "grocery", item_type: "item", payload: { name: "Cheddar Cheese", price: 5.50, emoji: "🧀" }, display_order: 6 },
  { game_id: "grocery", item_type: "item", payload: { name: "Bananas (bunch)", price: 2.50, emoji: "🍌" }, display_order: 7 },
  { game_id: "grocery", item_type: "item", payload: { name: "Orange Juice (64 oz)", price: 7.00, emoji: "🍊" }, display_order: 8 },
  { game_id: "grocery", item_type: "item", payload: { name: "Canned Corned Beef", price: 4.50, emoji: "🥫" }, display_order: 9 },
  { game_id: "grocery", item_type: "item", payload: { name: "Peas & Rice Mix", price: 3.75, emoji: "🫘" }, display_order: 10 },
  { game_id: "grocery", item_type: "item", payload: { name: "Cooking Oil (32 oz)", price: 5.25, emoji: "🫗" }, display_order: 11 },
  { game_id: "grocery", item_type: "item", payload: { name: "Sugar (2 lb)", price: 3.00, emoji: "🍬" }, display_order: 12 },
  { game_id: "grocery", item_type: "item", payload: { name: "Grits / Oatmeal", price: 3.50, emoji: "🥣" }, display_order: 13 },
  { game_id: "grocery", item_type: "item", payload: { name: "Crackers (box)", price: 4.00, emoji: "🍘" }, display_order: 14 },
  { game_id: "grocery", item_type: "item", payload: { name: "Peanut Butter", price: 5.00, emoji: "🥜" }, display_order: 15 },
  { game_id: "grocery", item_type: "item", payload: { name: "Frozen Vegetables", price: 4.50, emoji: "🥦" }, display_order: 16 },
  { game_id: "grocery", item_type: "item", payload: { name: "Toilet Paper (4 roll)", price: 4.75, emoji: "🧻" }, display_order: 17 },
  { game_id: "grocery", item_type: "item", payload: { name: "Dish Soap", price: 3.25, emoji: "🧴" }, display_order: 18 },
  { game_id: "grocery", item_type: "item", payload: { name: "Snack Chips", price: 3.50, emoji: "🍿" }, display_order: 19 },
  { game_id: "speed", item_type: "stock", payload: { name: "Bahamas Tourism Holdings", ticker: "BTH" }, display_order: 0 },
  { game_id: "speed", item_type: "stock", payload: { name: "Caribbean Cement Co.", ticker: "CCC" }, display_order: 1 },
  { game_id: "speed", item_type: "stock", payload: { name: "Island Telecom Ltd.", ticker: "ITL" }, display_order: 2 },
  { game_id: "speed", item_type: "stock", payload: { name: "Junkanoo Media Group", ticker: "JMG" }, display_order: 3 },
  { game_id: "speed", item_type: "stock", payload: { name: "Nassau Port Authority", ticker: "NPA" }, display_order: 4 },
  { game_id: "speed", item_type: "stock", payload: { name: "Reef Energy Corp.", ticker: "REC" }, display_order: 5 },
  { game_id: "speed", item_type: "stock", payload: { name: "Tropical Grocers Inc.", ticker: "TGI" }, display_order: 6 },
  { game_id: "speed", item_type: "stock", payload: { name: "Conch Republic Bank", ticker: "CRB" }, display_order: 7 },
  { game_id: "speed", item_type: "stock", payload: { name: "Palm Breeze Airlines", ticker: "PBA" }, display_order: 8 },
  { game_id: "speed", item_type: "stock", payload: { name: "Blue Lagoon Resorts", ticker: "BLR" }, display_order: 9 },
  { game_id: "speed", item_type: "news", payload: { text: "Tourism is booming this season in The Bahamas!", trend: "up" }, display_order: 0 },
  { game_id: "speed", item_type: "news", payload: { text: "Hurricane season warning issued for the Caribbean.", trend: "down" }, display_order: 1 },
  { game_id: "speed", item_type: "news", payload: { text: "New cruise port opens in Nassau — record visitors expected!", trend: "up" }, display_order: 2 },
  { game_id: "speed", item_type: "news", payload: { text: "Global oil prices rising, fuel costs spike across islands.", trend: "down" }, display_order: 3 },
  { game_id: "speed", item_type: "news", payload: { text: "Caribbean tech startup scene grows rapidly.", trend: "up" }, display_order: 4 },
  { game_id: "speed", item_type: "news", payload: { text: "Fishing industry reports record catch this quarter.", trend: "up" }, display_order: 5 },
  { game_id: "speed", item_type: "news", payload: { text: "Construction slowdown due to material shortages.", trend: "down" }, display_order: 6 },
  { game_id: "speed", item_type: "news", payload: { text: "International investors eye Caribbean real estate.", trend: "up" }, display_order: 7 },
  { game_id: "speed", item_type: "news", payload: { text: "Inflation concerns grow across the region.", trend: "down" }, display_order: 8 },
  { game_id: "speed", item_type: "news", payload: { text: "Renewable energy project launched on multiple islands.", trend: "up" }, display_order: 9 },
  { game_id: "speed", item_type: "news", payload: { text: "Supply chain delays impact local retailers.", trend: "down" }, display_order: 10 },
  { game_id: "speed", item_type: "news", payload: { text: "Major hotel chain announces Caribbean expansion.", trend: "up" }, display_order: 11 },
  { game_id: "speed", item_type: "news", payload: { text: "Regional bank reports lower profits this quarter.", trend: "down" }, display_order: 12 },
  { game_id: "speed", item_type: "news", payload: { text: "Local farmers market program boosts food production.", trend: "up" }, display_order: 13 },
  { game_id: "speed", item_type: "news", payload: { text: "Water shortage concerns in southern islands.", trend: "down" }, display_order: 14 },
  { game_id: "savings", item_type: "goal", payload: { name: "New Phone", amount: 800, emoji: "📱" }, display_order: 0 },
  { game_id: "savings", item_type: "goal", payload: { name: "Gaming Console", amount: 500, emoji: "🎮" }, display_order: 1 },
  { game_id: "savings", item_type: "goal", payload: { name: "Laptop for School", amount: 1200, emoji: "💻" }, display_order: 2 },
  { game_id: "savings", item_type: "goal", payload: { name: "Sneakers", amount: 200, emoji: "👟" }, display_order: 3 },
  { game_id: "savings", item_type: "goal", payload: { name: "Island Trip with Friends", amount: 600, emoji: "🏝️" }, display_order: 4 },
  { game_id: "savings", item_type: "goal", payload: { name: "Bicycle", amount: 350, emoji: "🚲" }, display_order: 5 },
  { game_id: "savings", item_type: "tradeoff", payload: { text: "Skip buying a snack at school every day", weeklySaving: 20, emoji: "🍫" }, display_order: 0 },
  { game_id: "savings", item_type: "tradeoff", payload: { text: "Do extra chores around the house for allowance", weeklySaving: 15, emoji: "🧹" }, display_order: 1 },
  { game_id: "savings", item_type: "tradeoff", payload: { text: "Skip the movie night out once a month", weeklySaving: 8, emoji: "🎬" }, display_order: 2 },
  { game_id: "savings", item_type: "tradeoff", payload: { text: "Make lunch at home instead of buying it", weeklySaving: 25, emoji: "🥪" }, display_order: 3 },
  { game_id: "savings", item_type: "tradeoff", payload: { text: "Sell old clothes or toys you don't use", weeklySaving: 10, emoji: "👕" }, display_order: 4 },
  { game_id: "savings", item_type: "tradeoff", payload: { text: "Walk or bike instead of taking a taxi", weeklySaving: 12, emoji: "🚶" }, display_order: 5 },
  { game_id: "savings", item_type: "tradeoff", payload: { text: "Skip buying a new game this month", weeklySaving: 5, emoji: "🎯" }, display_order: 6 },
];

export async function seedGameContent(): Promise<void> {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase.from("game_content").select("id").limit(1);
    if (existing && existing.length > 0) { console.log("[Supabase] ✓ Game content already seeded."); return; }
    for (const item of GAME_CONTENT_DATA) {
      await supabase.from("game_content").upsert(item, { onConflict: "game_id,item_type,display_order" });
    }
    console.log("[Supabase] ✓ Seeded game content.");
  } catch (e: any) { console.error("[Supabase] seedGameContent:", e.message); }
}

export async function seedStaticModules(): Promise<void> {
  if (!supabase) return;
  try {
    await seedStaticOrg();
    const { data: existingLessons } = await supabase
      .from("lesson_plans").select("id, grade_level")
      .eq("org_id", STATIC_ORG_ID).eq("subject", "static");
    const existingIds = new Set(((existingLessons ?? []) as any[]).map((l: any) => l.grade_level as string));
    let created = 0;
    for (const lesson of STATIC_LESSONS_DATA) {
      if (existingIds.has(lesson.grade_level)) continue;
      const { questions, video_url: _vid, ...planData } = lesson;
      const plan = await createLessonPlan({
        org_id: STATIC_ORG_ID, env_id: null,
        title: planData.title, instructor: planData.instructor,
        subject: "static", topic: planData.topic, grade_level: planData.grade_level,
        duration: planData.duration,
        objectives: planData.objectives, content_sections: planData.content_sections,
        is_published: true,
      });
      if (!plan) { console.error("[Supabase] seedStaticModules: Failed lesson:", planData.title); continue; }
      for (const q of questions) { await createLessonQuizQuestion({ ...q, lesson_id: plan.id }); }
      created++;
    }
    if (created > 0) console.log(`[Supabase] ✓ Seeded ${created} static lesson(s).`);
    else console.log("[Supabase] ✓ Static lessons already up to date.");
  } catch (e: any) { console.error("[Supabase] seedStaticModules:", e.message); }
}

// ─── In-memory fallbacks (used when Supabase tables don't exist yet) ────────────

const STATIC_VIDEO_URLS: Record<string, string | null> = Object.fromEntries(
  STATIC_LESSONS_DATA.map(l => [l.grade_level, l.video_url])
);

const REGIONAL_CONTENT_FALLBACK: Record<string, RegionRecord> = Object.fromEntries(
  REGIONAL_CONTENT_DATA.map(r => [r.region_code, r])
);

const GAME_CONTENT_FALLBACK: Record<string, Record<string, unknown[]>> = {};
for (const item of GAME_CONTENT_DATA) {
  if (!GAME_CONTENT_FALLBACK[item.game_id]) GAME_CONTENT_FALLBACK[item.game_id] = {};
  if (!GAME_CONTENT_FALLBACK[item.game_id][item.item_type]) GAME_CONTENT_FALLBACK[item.game_id][item.item_type] = [];
  (GAME_CONTENT_FALLBACK[item.game_id][item.item_type] as unknown[]).push(item.payload);
}

// ─── Getter functions ──────────────────────────────────────────────────────────

export async function getStaticModulesWithLessons(): Promise<StaticModuleWithLessons[]> {
  if (!supabase) return [];
  try {
    const { data: lessons, error: lessonsErr } = await supabase
      .from("lesson_plans").select("*")
      .eq("org_id", STATIC_ORG_ID).eq("subject", "static");
    if (lessonsErr || !lessons || lessons.length === 0) return [];
    const lessonIds = (lessons as any[]).map((l: any) => l.id as string);
    const { data: questions } = lessonIds.length > 0
      ? await supabase.from("lesson_quiz_questions").select("*").in("lesson_id", lessonIds).order("order_index")
      : { data: [] as any[] };
    const qByLesson: Record<string, LessonQuizQuestion[]> = {};
    for (const q of (questions ?? []) as LessonQuizQuestion[]) {
      if (!qByLesson[q.lesson_id]) qByLesson[q.lesson_id] = [];
      qByLesson[q.lesson_id].push(q);
    }
    return STATIC_MODULES_DATA
      .sort((a, b) => a.display_order - b.display_order)
      .map(mod => ({
        ...mod,
        lessons: (lessons as any[])
          .filter((l: any) => l.topic === mod.id)
          .sort((a: any, b: any) => String(a.grade_level ?? "").localeCompare(String(b.grade_level ?? "")))
          .map((l: any): StaticLessonRow => ({
            id: l.id,
            static_lesson_id: l.grade_level ?? l.id,
            title: l.title,
            description: l.instructor ?? "",
            duration: l.duration ?? null,
            video_url: STATIC_VIDEO_URLS[l.grade_level ?? ""] ?? null,
            objectives: Array.isArray(l.objectives) ? l.objectives : [],
            content_sections: Array.isArray(l.content_sections) ? l.content_sections : [],
            questions: qByLesson[l.id] ?? [],
          })),
      }))
      .filter(mod => mod.lessons.length > 0);
  } catch (e: any) {
    console.error("[Supabase] getStaticModulesWithLessons:", e.message);
    return [];
  }
}

export async function getRegionalContent(regionCode: string): Promise<RegionRecord | null> {
  if (!supabase) return REGIONAL_CONTENT_FALLBACK[regionCode] ?? null;
  const { data, error } = await supabase.from("regional_content").select("*").eq("region_code", regionCode).single();
  if (error || !data) return REGIONAL_CONTENT_FALLBACK[regionCode] ?? null;
  return data as RegionRecord;
}

export async function getGameContent(gameId: string): Promise<Record<string, unknown[]>> {
  if (!supabase) return GAME_CONTENT_FALLBACK[gameId] ?? {};
  const { data, error } = await supabase
    .from("game_content").select("item_type, payload")
    .eq("game_id", gameId).order("item_type").order("display_order");
  if (error || !data) return GAME_CONTENT_FALLBACK[gameId] ?? {};
  const grouped: Record<string, unknown[]> = {};
  for (const row of data as { item_type: string; payload: unknown }[]) {
    if (!grouped[row.item_type]) grouped[row.item_type] = [];
    grouped[row.item_type].push(row.payload);
  }
  return grouped;
}
