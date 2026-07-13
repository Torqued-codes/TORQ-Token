import { Router, Response } from "express";
import { ethers } from "ethers";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../supabaseAdmin";
import { transferForUser, getBalance } from "../blockchain";
 
const router = Router();
 
router.post("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const { to, amount } = req.body as { to?: string; amount?: string };
 
  if (!to || !ethers.isAddress(to)) {
    return res.status(400).json({ error: "Invalid recipient address" });
  }
  const amountNum = Number(amount);
  if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
 
  const { data: wallet, error } = await supabaseAdmin
    .from("wallets")
    .select("address, encrypted_private_key")
    .eq("user_id", userId)
    .maybeSingle();
 
  if (error) return res.status(500).json({ error: error.message });
  if (!wallet) return res.status(404).json({ error: "No wallet yet — call POST /api/wallet/init" });
 
  if (to.toLowerCase() === wallet.address.toLowerCase()) {
    return res.status(400).json({ error: "Cannot send to your own wallet" });
  }
 
  const currentBalance = Number(await getBalance(wallet.address));
  if (amountNum > currentBalance) {
    return res.status(400).json({ error: "Insufficient balance" });
  }
 
  try {
    // transfer() is atomic on-chain: either it fully succeeds and mines,
    // or it reverts and NOTHING changes — no partial/duplicated balances possible.
    const { txHash } = await transferForUser(wallet.encrypted_private_key, to, amount!);
    const newBalance = await getBalance(wallet.address);
 
    await supabaseAdmin.from("transactions").insert({
      wallet_address: wallet.address,
      type: "sent",
      amount,
      counterparty: to,
      tx_hash: txHash,
    });
 
    // Also log a "received" entry for the recipient, if they're a user in our system
    const { data: recipientWallet } = await supabaseAdmin
      .from("wallets")
      .select("address")
      .eq("address", to)
      .maybeSingle();
 
    if (recipientWallet) {
      await supabaseAdmin.from("transactions").insert({
        wallet_address: recipientWallet.address,
        type: "received",
        amount,
        counterparty: wallet.address,
        tx_hash: txHash,
      });
    }
 
    res.json({ txHash, balance: newBalance });
  } catch (err: any) {
    const reason = err?.reason || err?.shortMessage || err.message;
    res.status(500).json({ error: `Transfer failed: ${reason}` });
  }
});
 
export default router;
 

