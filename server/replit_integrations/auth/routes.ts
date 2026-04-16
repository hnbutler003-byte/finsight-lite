import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

function generateUsername(name: string): string {
  const clean = name.trim().replace(/[^a-zA-Z0-9]/g, "");
  const base = clean.length > 0 ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : "Player";
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${base}_${digits}`;
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, avatar } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Please enter your name." });
      }
      if (name.trim().length > 30) {
        return res.status(400).json({ message: "Name must be 30 characters or less." });
      }
      if (!avatar || typeof avatar !== "string") {
        return res.status(400).json({ message: "Please pick an avatar." });
      }

      let username = "";
      let attempts = 0;
      while (attempts < 10) {
        username = generateUsername(name);
        const existing = await authStorage.getUserByUsername(username);
        if (!existing) break;
        attempts++;
      }

      if (attempts >= 10) {
        return res.status(500).json({ message: "Couldn't generate a unique username. Try a different name!" });
      }

      const user = await authStorage.upsertUser({
        username,
        avatar,
        firstName: name.trim(),
      });

      // Explicitly save session before responding so subsequent requests in the
      // same browser context (e.g. auto-join class/org) see the authenticated session.
      await new Promise<void>((resolve, reject) => {
        req.session.userId = user.id;
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      return res.status(201).json(user);
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Failed to create account." });
    }
  });

  // Resume session by username (for returning students whose session expired)
  app.post("/api/auth/resume", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== "string" || !username.trim()) {
        return res.status(400).json({ message: "Please enter your username." });
      }
      const user = await authStorage.getUserByUsername(username.trim());
      if (!user) {
        return res.status(404).json({ message: "Username not found. Check the spelling and try again." });
      }
      req.session.userId = user.id;
      return res.json(user);
    } catch (error) {
      console.error("Resume session error:", error);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    return res.json(req.user);
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not signed in." });

      const normalize = (val: unknown): string | null | undefined => {
        if (val === undefined) return undefined;
        if (val === null) return null;
        if (typeof val !== "string") return undefined;
        const trimmed = val.trim();
        if (trimmed.length === 0) return null;
        if (trimmed.length > 50) {
          throw new Error("Names must be 50 characters or less.");
        }
        return trimmed;
      };

      const firstName = normalize(req.body?.firstName);
      const lastName = normalize(req.body?.lastName);

      if (firstName === undefined && lastName === undefined) {
        return res.status(400).json({ message: "No changes submitted." });
      }

      const updated = await authStorage.updateProfile(userId, { firstName, lastName });
      if (!updated) return res.status(404).json({ message: "User not found." });
      return res.json(updated);
    } catch (error: any) {
      console.error("Update profile error:", error);
      const message = typeof error?.message === "string" ? error.message : "Failed to update profile.";
      return res.status(400).json({ message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed." });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out." });
    });
  });
}
