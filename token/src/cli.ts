#!/usr/bin/env node
/**
 * cli.ts
 * ---------------------------------------------------------------------------
 * Thin orchestration layer: parses CLI args, calls hasher.ts + blockchain.ts,
 * and reports results via logger.ts. No hashing or contract logic lives here.
 */

import { Command } from "commander";
import { promises as fs } from "fs";
import path from "path";
import {
  hashDirectory,
  computeCombinedHash,
} from "./hasher";
import {
  fetchOnChainHash,
  registerOnChain,
  updateOnChain,
  ChainConfigError,
  ContractCallError,
  PackageNotFoundOnChainError,
} from "./blockchain";
import {
  logVerified,
  logMismatch,
  logNotFound,
  logError,
  logInfo,
  logSuccess,
  logSummary,
} from "./logger";
import { DependencyManifest } from "./types";

const program = new Command();

program
  .name("dep-integrity")
  .description("Decentralized Dependency Integrity Monitor — verify local packages against an on-chain ledger")
  .version("1.0.0");

/* --------------------------------------------------------------------- */
/* verify — hash local dirs and compare against the on-chain ledger      */
/* --------------------------------------------------------------------- */
program
  .command("verify")
  .description("Hash local dependency directories and verify against the on-chain ledger")
  .option("-m, --manifest <path>", "Path to dependency manifest JSON", "./dependencies.json")
  .option("-d, --dir <path>", "Verify a single directory instead of using a manifest")
  .option("-n, --name <name>", "Package name (required with --dir)")
  .option("-v, --version <version>", "Package version (required with --dir)")
  .action(async (opts) => {
    let entries: { name: string; version: string; path: string }[] = [];

    try {
      if (opts.dir) {
        if (!opts.name || !opts.version) {
          throw new Error("--dir requires both --name and --version");
        }
        entries = [{ name: opts.name, version: opts.version, path: opts.dir }];
      } else {
        const manifestPath = path.resolve(opts.manifest);
        const raw = await fs.readFile(manifestPath, "utf-8").catch(() => {
          throw new Error(`Manifest not found at "${manifestPath}". Use --manifest or --dir.`);
        });
        const manifest: DependencyManifest = JSON.parse(raw);
        entries = manifest.dependencies;
      }
    } catch (err: any) {
      logError(err.message);
      process.exitCode = 1;
      return;
    }

    let verified = 0;
    let mismatched = 0;
    let unregistered = 0;
    let errors = 0;

    for (const entry of entries) {
      try {
        logInfo(`Scanning ${entry.name}@${entry.version} at "${entry.path}" ...`);
        const localHash = await computeCombinedHash(entry.path);
        const onChainRecordHex = `0x${localHash}`; // for display purposes only

        try {
          const record = await fetchOnChainHash(entry.name, entry.version);
          const normalizedLocal = onChainRecordHex.toLowerCase();
          const normalizedChain = record.hash.toLowerCase();

          if (normalizedLocal === normalizedChain) {
            logVerified(entry.name, entry.version, localHash);
            verified++;
          } else {
            logMismatch(entry.name, entry.version, normalizedLocal, normalizedChain);
            mismatched++;
          }
        } catch (err) {
          if (err instanceof PackageNotFoundOnChainError) {
            logNotFound(entry.name, entry.version);
            unregistered++;
          } else {
            throw err;
          }
        }
      } catch (err: any) {
        if (err instanceof ChainConfigError) {
          logError(`Configuration error: ${err.message}`);
        } else if (err instanceof ContractCallError) {
          logError(`Blockchain call failed for ${entry.name}@${entry.version}: ${err.message}`);
        } else {
          logError(`Failed to process ${entry.name}@${entry.version}: ${err.message}`);
        }
        errors++;
      }
    }

    logSummary(verified, mismatched, unregistered, errors);
    if (mismatched > 0 || errors > 0) process.exitCode = 1;
  });

/* --------------------------------------------------------------------- */
/* register — owner-only, push a new local hash to the ledger            */
/* --------------------------------------------------------------------- */
program
  .command("register")
  .description("Hash a local directory and register it on-chain as the known-good version (owner only)")
  .requiredOption("-d, --dir <path>", "Path to the dependency directory to hash")
  .requiredOption("-n, --name <name>", "Package name")
  .requiredOption("-v, --version <version>", "Package version")
  .option("--update", "Update an existing ledger entry instead of creating a new one")
  .action(async (opts) => {
    try {
      const result = await hashDirectory(opts.dir);
      logInfo(`Hashed ${result.fileCount} files in "${result.rootDir}"`);
      logInfo(`Combined SHA-256: ${result.combinedHash}`);

      const txHash = opts.update
        ? await updateOnChain(opts.name, opts.version, result.combinedHash)
        : await registerOnChain(opts.name, opts.version, result.combinedHash);

      logSuccess(`✔ ${opts.update ? "Updated" : "Registered"} on-chain. Tx: ${txHash}`);
    } catch (err: any) {
      logError(err.message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);