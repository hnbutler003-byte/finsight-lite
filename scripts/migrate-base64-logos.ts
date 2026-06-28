import crypto from "crypto";
import {
  ObjectStorageService,
  objectStorageClient,
} from "../server/replit_integrations/object_storage";
import { supabase } from "../server/supabase";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const isBase64 = !!match[2];
  const payload = match[3];
  const buffer = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
  return { mime, buffer };
}

async function main() {
  if (!supabase) {
    console.error("Supabase is not configured. Aborting.");
    process.exit(1);
  }

  const objectStorage = new ObjectStorageService();
  const publicPaths = objectStorage.getPublicObjectSearchPaths();
  const targetDir = publicPaths[0];

  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, logo_url")
    .like("logo_url", "data:image/%");

  if (error) {
    console.error("Failed to query organizations:", error.message);
    process.exit(1);
  }

  const rows = orgs ?? [];
  console.log(`Found ${rows.length} organization(s) with base64 logos.`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const org of rows) {
    const logoUrl: string = org.logo_url ?? "";
    if (!logoUrl.startsWith("data:image/")) {
      skipped++;
      continue;
    }

    const parsed = parseDataUrl(logoUrl);
    if (!parsed) {
      console.warn(`[${org.id}] Could not parse data URL: skipping.`);
      failed++;
      continue;
    }

    const ext = MIME_TO_EXT[parsed.mime] || "png";
    const filename = `${org.id}-${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}.${ext}`;
    const objectKey = `logos/${filename}`;
    const fullPath = `${targetDir.replace(/\/$/, "")}/${objectKey}`;
    const [, bucketName, ...rest] = fullPath.split("/");
    const objectName = rest.join("/");

    try {
      await objectStorageClient
        .bucket(bucketName)
        .file(objectName)
        .save(parsed.buffer, {
          contentType: parsed.mime,
          resumable: false,
          metadata: { cacheControl: "public, max-age=2592000" },
        });

      const newUrl = `/public-objects/${objectKey}`;
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: newUrl })
        .eq("id", org.id)
        .like("logo_url", "data:image/%");

      if (updateError) {
        console.error(
          `[${org.id}] Failed to update logo_url:`,
          updateError.message,
        );
        failed++;
        continue;
      }

      console.log(
        `[${org.id}] ${org.name}: migrated ${parsed.buffer.length} bytes → ${newUrl}`,
      );
      migrated++;
    } catch (e: any) {
      console.error(`[${org.id}] Upload failed:`, e?.message ?? e);
      failed++;
    }
  }

  console.log(
    `\nDone. migrated=${migrated} skipped=${skipped} failed=${failed}`,
  );
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
