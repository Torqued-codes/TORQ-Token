/**
 * blockchain.ts
 * ---------------------------------------------------------------------------
 * Everything ethers.js / smart-contract related lives here, decoupled from
 * hashing (hasher.ts) and presentation (logger.ts). This module only knows
 * how to talk to the DependencyLedger contract.
 */

import { ethers, Contract, JsonRpcProvider, Wallet } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const LEDGER_ABI = [
  "function registerPackage(string name, string version, bytes32 hash) external",
  "function updatePackage(string name, string version, bytes32 newHash) external",
  "function revokePackage(string name, string version) external",
  "function getPackageHash(string name, string version) external view returns (bytes32 hash, uint256 registeredAt, uint256 updatedAt)",
  "function packageExists(string name, string version) external view returns (bool)",
  "event PackageRegistered(string indexed name, string version, bytes32 hash, uint256 timestamp)",
  "event PackageUpdated(string indexed name, string version, bytes32 oldHash, bytes32 newHash, uint256 timestamp)",
];

export interface ChainConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey?: string; // only required for write operations (register/update/revoke)
}

export class ChainConfigError extends Error {}
export class ContractCallError extends Error {}
export class PackageNotFoundOnChainError extends Error {}

function loadConfig(): ChainConfig {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.LEDGER_CONTRACT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl) {
    throw new ChainConfigError('Missing "RPC_URL" in .env (e.g. http://127.0.0.1:8545)');
  }
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new ChainConfigError('Missing or invalid "LEDGER_CONTRACT_ADDRESS" in .env');
  }

  return { rpcUrl, contractAddress, privateKey };
}

function getProvider(rpcUrl: string): JsonRpcProvider {
  try {
    return new JsonRpcProvider(rpcUrl);
  } catch (err: any) {
    throw new ChainConfigError(`Failed to construct provider for "${rpcUrl}": ${err.message}`);
  }
}

async function assertProviderReachable(provider: JsonRpcProvider): Promise<void> {
  try {
    await provider.getBlockNumber();
  } catch (err: any) {
    throw new ChainConfigError(
      `Cannot reach RPC node at the configured URL. Is your local node (Hardhat/Anvil) running? Details: ${err.message}`
    );
  }
}

function getReadContract(config: ChainConfig, provider: JsonRpcProvider): Contract {
  return new Contract(config.contractAddress, LEDGER_ABI, provider);
}

function getWriteContract(config: ChainConfig, provider: JsonRpcProvider): Contract {
  if (!config.privateKey) {
    throw new ChainConfigError('Missing "PRIVATE_KEY" in .env — required for write operations');
  }
  const wallet = new Wallet(config.privateKey, provider);
  return new Contract(config.contractAddress, LEDGER_ABI, wallet);
}

/** Convert a hex sha256 digest string into the bytes32 format Solidity expects. */
export function toBytes32(hexDigest: string): string {
  const clean = hexDigest.startsWith("0x") ? hexDigest : `0x${hexDigest}`;
  if (clean.length !== 66) {
    throw new Error(`Expected a 32-byte hex digest, got ${clean.length - 2} hex chars`);
  }
  return clean;
}

export interface OnChainRecord {
  hash: string;
  registeredAt: number;
  updatedAt: number;
}

/** Read the known-good hash for a package/version from the ledger contract. */
export async function fetchOnChainHash(
  packageName: string,
  version: string
): Promise<OnChainRecord> {
  const config = loadConfig();
  const provider = getProvider(config.rpcUrl);
  await assertProviderReachable(provider);
  const contract = getReadContract(config, provider);

  try {
    const [hash, registeredAt, updatedAt] = await contract.getPackageHash(packageName, version);
    return {
      hash: hash as string,
      registeredAt: Number(registeredAt),
      updatedAt: Number(updatedAt),
    };
  } catch (err: any) {
    if (err.message?.includes("PackageNotFound") || err.reason?.includes("PackageNotFound")) {
      throw new PackageNotFoundOnChainError(
        `No ledger entry found for "${packageName}@${version}". It may need to be registered first.`
      );
    }
    throw new ContractCallError(`On-chain read failed: ${err.message}`);
  }
}

/** Owner-only: register a new package hash on-chain. */
export async function registerOnChain(
  packageName: string,
  version: string,
  sha256Hex: string
): Promise<string> {
  const config = loadConfig();
  const provider = getProvider(config.rpcUrl);
  await assertProviderReachable(provider);
  const contract = getWriteContract(config, provider);

  try {
    const tx = await contract.registerPackage(packageName, version, toBytes32(sha256Hex));
    const receipt = await tx.wait();
    return receipt.hash as string;
  } catch (err: any) {
    throw new ContractCallError(`On-chain registration failed: ${err.reason ?? err.message}`);
  }
}

/** Owner-only: update an existing package's hash on-chain. */
export async function updateOnChain(
  packageName: string,
  version: string,
  sha256Hex: string
): Promise<string> {
  const config = loadConfig();
  const provider = getProvider(config.rpcUrl);
  await assertProviderReachable(provider);
  const contract = getWriteContract(config, provider);

  try {
    const tx = await contract.updatePackage(packageName, version, toBytes32(sha256Hex));
    const receipt = await tx.wait();
    return receipt.hash as string;
  } catch (err: any) {
    throw new ContractCallError(`On-chain update failed: ${err.reason ?? err.message}`);
  }
}