import { Router, Response } from "express";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../supabaseAdmin";
import { mineForUser, getBalance } from "../blockchain";

const router = Router();

router.post("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;

  const { data: wallet, error } = await supabaseAdmin
    .from("wallets")
    .select("address, encrypted_private_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!wallet) return res.status(404).json({ error: "No wallet yet — call POST /api/wallet/init" });

  try {
    const { txHash, reward } = await mineForUser(wallet.encrypted_private_key);
    const balance = await getBalance(wallet.address);
    res.json({ txHash, reward, balance });
  } catch (err: any) {
    const reason = err?.reason || err?.shortMessage || err.message;
    if (reason?.includes("MiningOnCooldown")) {
      return res.status(429).json({ error: "Mining is on cooldown", detail: reason });
    }
    res.status(500).json({ error: `Mining failed: ${reason}` });
  }
});

export default router;