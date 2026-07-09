// Org logo storage backed by Supabase Storage.
// Works identically on Replit dev and Railway production. The Replit object
// storage sidecar (127.0.0.1:1106) only exists on Replit hosting, so logos
// live in a public Supabase bucket that both environments can reach.
import { supabase } from "./supabase";

const LOGO_BUCKET = "org-logos";
let bucketVerified = false;

function requireClient() {
  if (!supabase) {
    throw new Error(
      "[Supabase] Storage client not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }
  return supabase;
}

async function ensureLogoBucket(): Promise<void> {
  if (bucketVerified) return;
  const client = requireClient();
  const { error } = await client.storage.createBucket(LOGO_BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`[Supabase] Failed to create logo bucket: ${error.message}`);
  }
  bucketVerified = true;
}

export async function uploadOrgLogo(
  buffer: Buffer,
  objectKey: string,
  contentType: string,
): Promise<string> {
  const client = requireClient();
  await ensureLogoBucket();
  const { error } = await client.storage
    .from(LOGO_BUCKET)
    .upload(objectKey, buffer, { contentType, cacheControl: "2592000", upsert: false });
  if (error) {
    throw new Error(`[Supabase] Logo upload failed: ${error.message}`);
  }
  const { data } = client.storage.from(LOGO_BUCKET).getPublicUrl(objectKey);
  if (!data?.publicUrl) {
    throw new Error("[Supabase] Could not resolve a public URL for the uploaded logo");
  }
  return data.publicUrl;
}
