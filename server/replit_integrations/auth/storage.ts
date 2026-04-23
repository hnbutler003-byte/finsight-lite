import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateProfile(
    id: string,
    data: { firstName?: string | null; lastName?: string | null }
  ): Promise<User | undefined>;
  linkEmail(id: string, email: string, profileImageUrl?: string): Promise<User | undefined>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateProfile(
    id: string,
    data: { firstName?: string | null; lastName?: string | null }
  ): Promise<User | undefined> {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (data.firstName !== undefined) update.firstName = data.firstName;
    if (data.lastName !== undefined) update.lastName = data.lastName;
    const [user] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async linkEmail(
    id: string,
    email: string,
    profileImageUrl?: string
  ): Promise<User | undefined> {
    const update: Record<string, unknown> = { email: email.toLowerCase(), updatedAt: new Date() };
    if (profileImageUrl) update.profileImageUrl = profileImageUrl;
    const [user] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
