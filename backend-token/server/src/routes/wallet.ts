import { Router, Response } from "express";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../supabaseAdmin";
import { createCustodialWallet, getBalance, getCooldownRemaining } from "../blockchain";

const router = Router();

router.post("/init", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;

  const { data: existing } = await supabaseAdmin
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return res.json({ address: existing.address, created: false });
  }

  const { address, encryptedPrivateKey } = createCustodialWallet();

  const { error } = await supabaseAdmin.from("wallets").insert({
    user_id: userId,
    address,
    encrypted_private_key: encryptedPrivateKey,
  });

  if (error) {
    return res.status(500).json({ error: `Failed to create wallet: ${error.message}` });
  }

  res.json({ address, created: true });
});
router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;

  const { data: wallet, error } = await supabaseAdmin
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!wallet) return res.status(404).json({ error: "No wallet yet — call POST /api/wallet/init" });

  const [balance, cooldownRemaining] = await Promise.all([
    getBalance(wallet.address),
    getCooldownRemaining(wallet.address),
  ]);

  res.json({ address: wallet.address, balance, cooldownRemaining });
});

export default router;