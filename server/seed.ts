import { storage } from "./storage";
import { db } from "./db";
import { categories } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function seedDatabase() {
  const defaultCategories = [
    { name: "Salary", type: "income", icon: "💰", color: "#10B981" },
    { name: "Allowance", type: "income", icon: "🪙", color: "#F59E0B" },
    { name: "Food & Dining", type: "expense", icon: "🍴", color: "#EF4444" },
    { name: "Transportation", type: "expense", icon: "🚗", color: "#F59E0B" },
    { name: "Shopping", type: "expense", icon: "🛍️", color: "#3B82F6" },
    { name: "Entertainment", type: "expense", icon: "🎬", color: "#8B5CF6" },
    { name: "Bills & Utilities", type: "expense", icon: "⚡", color: "#6366F1" },
    { name: "Housing", type: "expense", icon: "🏠", color: "#EC4899" },
    { name: "Health", type: "expense", icon: "❤️", color: "#14B8A6" },
    { name: "Education", type: "expense", icon: "🎓", color: "#0EA5E9" },
    { name: "Insurance", type: "expense", icon: "🛡️", color: "#64748B" },
    { name: "Personal Care", type: "expense", icon: "✂️", color: "#D946EF" },
    { name: "Travel", type: "expense", icon: "✈️", color: "#F97316" },
    { name: "Gifts & Donations", type: "expense", icon: "🎁", color: "#A855F7" },
    { name: "Freelance", type: "income", icon: "💼", color: "#22C55E" },
    { name: "Investments", type: "income", icon: "📈", color: "#0D9488" },
    { name: "Other", type: "expense", icon: "📦", color: "#9CA3AF" },
  ];

  try {
    for (const cat of defaultCategories) {
      const existing = await db.select().from(categories)
        .where(and(eq(categories.name, cat.name), isNull(categories.userId)))
        .limit(1);
      if (existing.length === 0) {
        await storage.createCategory(cat as any);
      }
    }
  } catch (e: any) {
    console.log("Seeding categories error:", e?.message || "Unknown error");
  }
}
