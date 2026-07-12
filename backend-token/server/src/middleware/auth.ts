import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabaseAdmin";
 
export interface AuthedRequest extends Request {
  userId?: string;
}
 
/** Verifies the "Authorization: Bearer <supabase_access_token>" header. */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }
 
    const token = authHeader.slice("Bearer ".length);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
 
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
 
    req.userId = data.user.id;
    next();
  } catch (err: any) {
    console.error("requireAuth crashed:", err);
    res.status(500).json({ error: `Auth check failed: ${err.message}` });
  }
}