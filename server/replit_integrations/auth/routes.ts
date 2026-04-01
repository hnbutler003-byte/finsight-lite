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

      req.session.userId = user.id;
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
