import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
 
import walletRoutes from "./routes/wallet";
import mineRoutes from "./routes/mine";
import sendRoutes from "./routes/send";
import historyRoutes from "./routes/history";
 
dotenv.config();
 
// Without these, an unhandled promise rejection anywhere in the app can
// silently terminate the whole Node process (Node 15+ default behavior) -
// which is exactly what produces "was listening, now connection refused"
// with no visible error. Log loudly instead of dying silently.
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED PROMISE REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
 
const app = express();
app.use(cors());
app.use(express.json());
 
app.get("/health", (_req, res) => res.json({ status: "ok" }));
 
app.use("/api/wallet", walletRoutes);
app.use("/api/mine", mineRoutes);
app.use("/api/send", sendRoutes);
app.use("/api/history", historyRoutes);
 
// Central error handler (catches anything routes didn't handle themselves)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
 
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`TORQ backend listening on http://localhost:${PORT}`);
});
