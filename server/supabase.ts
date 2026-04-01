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
  created_at: string;
};

export type OrgStudent = {
  id: string;
  org_id: string;
  env_id: string;
  student_user_id: string;
  joined_at: string;
};

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
  return data ?? [];
}

export async function createOrgEnvironment(env: Omit<OrgEnvironment, "id" | "created_at">): Promise<OrgEnvironment | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("org_environments").insert(env).select().single();
  if (error) { console.error("[Supabase] createOrgEnvironment:", error.message); return null; }
  return data;
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
