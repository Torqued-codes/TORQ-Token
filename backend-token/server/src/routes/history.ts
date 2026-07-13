import { Router, Response } from "express";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../supabaseAdmin";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .maybeSingle();

  if (walletError) return res.status(500).json({ error: walletError.message });
  if (!wallet) return res.status(404).json({ error: "No wallet yet — call POST /api/wallet/init" });

  const { data: rows, error } = await supabaseAdmin
    .from("transactions")
    .select("type, amount, counterparty, tx_hash, created_at")
    .eq("wallet_address", wallet.address)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  const history = (rows || []).map((r) => ({
    type: r.type,
    amount: r.amount,
    counterparty: r.counterparty,
    txHash: r.tx_hash,
    timestamp: Math.floor(new Date(r.created_at).getTime() / 1000),
  }));

  res.json({ history });
});

export default router;