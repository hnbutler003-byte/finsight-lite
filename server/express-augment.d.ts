import type { User } from "@shared/models/auth";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
