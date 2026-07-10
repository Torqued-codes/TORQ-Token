import { Router, Response } from "express";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../supabaseAdmin";
import { getTransactionHistory } from "../blockchain";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;

  const { data: wallet, error } = await supabaseAdmin
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!wallet) return res.status(404).json({ error: "No wallet yet — call POST /api/wallet/init" });

  try {
    const history = await getTransactionHistory(wallet.address);
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load history: ${err.message}` });
  }
});

export default router;