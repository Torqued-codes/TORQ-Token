/**
 * logger.ts
 * ---------------------------------------------------------------------------
 * Centralized, color-coded terminal output. Keeping this separate means
 * hasher.ts and blockchain.ts never need to know how results are displayed.
 */

import chalk from "chalk";

export function logVerified(pkg: string, version: string, hash: string): void {
  console.log(
    chalk.bgGreen.black.bold(" VERIFIED ") +
      " " +
      chalk.green(`${pkg}@${version}`) +
      chalk.gray(`  (${hash.slice(0, 12)}...)`)
  );
}

export function logMismatch(pkg: string, version: string, local: string, chainHash: string): void {
  console.log(chalk.bgRed.white.bold(" INTEGRITY MISMATCH ") + " " + chalk.red.bold(`${pkg}@${version}`));
  console.log(chalk.red(`  Local hash:  ${local}`));
  console.log(chalk.red(`  Ledger hash: ${chainHash}`));
  console.log(chalk.yellow("  ⚠ This dependency has diverged from the known-good on-chain record."));
}

export function logNotFound(pkg: string, version: string): void {
  console.log(
    chalk.bgYellow.black.bold(" UNREGISTERED ") +
      " " +
      chalk.yellow(`${pkg}@${version}`) +
      chalk.gray(" — no entry exists on the ledger yet.")
  );
}

export function logError(message: string): void {
  console.error(chalk.bgRed.white.bold(" ERROR ") + " " + chalk.red(message));
}

export function logInfo(message: string): void {
  console.log(chalk.cyan(message));
}

export function logSuccess(message: string): void {
  console.log(chalk.green.bold(message));
}

export function logWarn(message: string): void {
  console.log(chalk.yellow(message));
}

export function logSummary(verified: number, mismatched: number, unregistered: number, errors: number): void {
  console.log("\n" + chalk.bold("── Verification Summary ──────────────────"));
  console.log(chalk.green(`  ✔ Verified:      ${verified}`));
  console.log(chalk.red(`  ✘ Mismatched:    ${mismatched}`));
  console.log(chalk.yellow(`  ? Unregistered:  ${unregistered}`));
  if (errors > 0) console.log(chalk.magenta(`  ! Errors:        ${errors}`));
  console.log(chalk.bold("───────────────────────────────────────────\n"));
}