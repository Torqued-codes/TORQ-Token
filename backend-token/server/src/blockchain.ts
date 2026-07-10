import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

const TORQ_ABI = [
  "function mine() external returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function cooldownRemaining(address miner) external view returns (uint256)",
  "event Mined(address indexed miner, uint256 amount, uint256 timestamp)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const TORQ_CONTRACT_ADDRESS = process.env.TORQ_CONTRACT_ADDRESS;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte base64 key

if (!TORQ_CONTRACT_ADDRESS) throw new Error("Missing TORQ_CONTRACT_ADDRESS in server/.env");
if (!ENCRYPTION_KEY) throw new Error("Missing ENCRYPTION_KEY in server/.env");

const provider = new JsonRpcProvider(RPC_URL);
const keyBuffer = Buffer.from(ENCRYPTION_KEY, "base64");
if (keyBuffer.length !== 32) {
  throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)");
}

export function encryptPrivateKey(privateKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptPrivateKey(encrypted: string): string {
  const [ivB64, authTagB64, dataB64] = encrypted.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export function createCustodialWallet(): { address: string; encryptedPrivateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    encryptedPrivateKey: encryptPrivateKey(wallet.privateKey),
  };
}

function getContract(signerOrProvider: Wallet | JsonRpcProvider): Contract {
  return new Contract(TORQ_CONTRACT_ADDRESS!, TORQ_ABI, signerOrProvider);
}

export async function getBalance(address: string): Promise<string> {
  const contract = getContract(provider);
  const raw = await contract.balanceOf(address);
  return ethers.formatUnits(raw, 18);
}

export async function getCooldownRemaining(address: string): Promise<number> {
  const contract = getContract(provider);
  const remaining = await contract.cooldownRemaining(address);
  return Number(remaining);
}

export interface HistoryEntry {
  type: "mined" | "sent" | "received";
  amount: string;
  counterparty: string | null;
  txHash: string;
  timestamp: number;
}

export async function getTransactionHistory(address: string): Promise<HistoryEntry[]> {
  const contract = getContract(provider);
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 50000); // adjust range for your chain

  const [minedEvents, sentEvents, receivedEvents] = await Promise.all([
    contract.queryFilter(contract.filters.Mined(address), fromBlock, currentBlock),
    contract.queryFilter(contract.filters.Transfer(address, null), fromBlock, currentBlock),
    contract.queryFilter(contract.filters.Transfer(null, address), fromBlock, currentBlock),
  ]);

  const entries: HistoryEntry[] = [];

  for (const ev of minedEvents) {
    const args = (ev as any).args;
    const block = await ev.getBlock();
    entries.push({
      type: "mined",
      amount: ethers.formatUnits(args.amount, 18),
      counterparty: null,
      txHash: ev.transactionHash,
      timestamp: block.timestamp,
    });
  }
  for (const ev of sentEvents) {
    const args = (ev as any).args;
    if (args.from.toLowerCase() === address.toLowerCase() && args.from !== ethers.ZeroAddress) {
      const block = await ev.getBlock();
      entries.push({
        type: "sent",
        amount: ethers.formatUnits(args.value, 18),
        counterparty: args.to,
        txHash: ev.transactionHash,
        timestamp: block.timestamp,
      });
    }
  }
  for (const ev of receivedEvents) {
    const args = (ev as any).args;
    if (args.to.toLowerCase() === address.toLowerCase() && args.from !== ethers.ZeroAddress) {
      const block = await ev.getBlock();
      entries.push({
        type: "received",
        amount: ethers.formatUnits(args.value, 18),
        counterparty: args.from,
        txHash: ev.transactionHash,
        timestamp: block.timestamp,
      });
    }
  }

  return entries.sort((a, b) => b.timestamp - a.timestamp);
}
export async function mineForUser(encryptedPrivateKey: string) {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const signer = new Wallet(privateKey, provider);
  const contract = getContract(signer);

  const tx = await contract.mine();
  const receipt = await tx.wait();

  const mintedEvent = receipt.logs
    .map((log: any) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed: any) => parsed?.name === "Mined");

  const reward = mintedEvent ? ethers.formatUnits(mintedEvent.args.amount, 18) : "0";
  return { txHash: receipt.hash, reward };
}

export async function transferForUser(
  encryptedPrivateKey: string,
  toAddress: string,
  amountTQ: string
) {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const signer = new Wallet(privateKey, provider);
  const contract = getContract(signer);

  const amountWei = ethers.parseUnits(amountTQ, 18);
  const tx = await contract.transfer(toAddress, amountWei);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}