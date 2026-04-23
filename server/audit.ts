import type { Request } from "express";
import { db } from "./db";
import { auditLog, type InsertAuditLogEntry } from "@shared/schema";
import { desc, and, eq, gte, lte, SQL, sql } from "drizzle-orm";

export type AuditActorType = "admin" | "org_admin" | "teacher" | "student" | "system";

export interface AuditInput {
  actorType: AuditActorType;
  actorId?: string | number | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  orgId?: string | null;
  meta?: Record<string, any>;
  req?: Request;
}

function clientIp(req?: Request): string | null {
  if (!req) return null;
  const xf = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return xf || req.socket?.remoteAddress || null;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    const row: InsertAuditLogEntry = {
      actorType: input.actorType,
      actorId: input.actorId != null ? String(input.actorId) : null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId != null ? String(input.targetId) : null,
      orgId: input.orgId ?? null,
      meta: input.meta ?? {},
      ip: clientIp(input.req),
    };
    await db.insert(auditLog).values(row);
  } catch (e) {
    console.warn("[audit] write failed:", (e as Error).message);
  }
}

export interface AuditQuery {
  actorType?: AuditActorType;
  actorId?: string;
  action?: string;
  orgId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditLog(q: AuditQuery = {}) {
  const conditions: SQL[] = [];
  if (q.actorType) conditions.push(eq(auditLog.actorType, q.actorType));
  if (q.actorId) conditions.push(eq(auditLog.actorId, q.actorId));
  if (q.action) conditions.push(sql`${auditLog.action} ILIKE ${"%" + q.action + "%"}`);
  if (q.orgId) conditions.push(eq(auditLog.orgId, q.orgId));
  if (q.from) conditions.push(gte(auditLog.createdAt, new Date(q.from)));
  if (q.to) {
    // If the user passes a bare YYYY-MM-DD, treat it as inclusive end-of-day
    // so "to=2026-04-23" returns rows up through 23:59:59.999 of that day.
    const isBareDate = /^\d{4}-\d{2}-\d{2}$/.test(q.to);
    const toDate = isBareDate ? new Date(`${q.to}T23:59:59.999Z`) : new Date(q.to);
    conditions.push(lte(auditLog.createdAt, toDate));
  }

  const limit = Math.min(Math.max(q.limit ?? 100, 1), 500);
  const offset = Math.max(q.offset ?? 0, 0);

  const rows = await db
    .select()
    .from(auditLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}
