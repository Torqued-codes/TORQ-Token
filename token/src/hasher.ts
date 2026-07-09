/**
 * hasher.ts
 * ---------------------------------------------------------------------------
 * Pure, blockchain-agnostic module responsible for recursively hashing a
 * local dependency directory. Deliberately has zero knowledge of ethers.js
 * or the contract — keeps the hashing logic independently testable/reusable.
 */

import { createHash, Hash } from "crypto";
import { createReadStream, promises as fs } from "fs";
import path from "path";

export interface FileHashEntry {
  relativePath: string;
  sha256: string;
}

export interface DirectoryHashResult {
  rootDir: string;
  fileCount: number;
  files: FileHashEntry[];
  /** Deterministic combined SHA-256 over all file hashes, sorted by path. */
  combinedHash: string;
}

const DEFAULT_IGNORE = new Set([".git", ".DS_Store"]);

/** Hash a single file's contents via streaming (safe for large files). */
export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash: Hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) =>
      reject(new Error(`Failed to read file "${filePath}": ${err.message}`))
    );
  });
}

/** Recursively walk a directory, returning all file paths (relative to root). */
async function walk(dir: string, root: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new Error(`Directory not found: "${dir}"`);
    }
    throw new Error(`Unable to read directory "${dir}": ${err.message}`);
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (DEFAULT_IGNORE.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, root)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Recursively hashes every file under `dirPath`, then produces a single
 * deterministic "combined" hash (sorted by relative path so directory
 * iteration order never affects the result — critical for reproducibility
 * across CI runners and operating systems).
 */
export async function hashDirectory(dirPath: string): Promise<DirectoryHashResult> {
  const resolvedRoot = path.resolve(dirPath);

  const stat = await fs.stat(resolvedRoot).catch(() => null);
  if (!stat) {
    throw new Error(`Dependency directory does not exist: "${resolvedRoot}"`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: "${resolvedRoot}"`);
  }

  const allFiles = await walk(resolvedRoot, resolvedRoot);
  if (allFiles.length === 0) {
    throw new Error(`No files found to hash in "${resolvedRoot}"`);
  }

  const entries: FileHashEntry[] = [];
  for (const filePath of allFiles) {
    const relativePath = path.relative(resolvedRoot, filePath).split(path.sep).join("/");
    const sha256 = await hashFile(filePath);
    entries.push({ relativePath, sha256 });
  }

  // Sort for deterministic combined hash regardless of filesystem order
  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const combinedHasher = createHash("sha256");
  for (const entry of entries) {
    combinedHasher.update(`${entry.relativePath}:${entry.sha256}\n`);
  }

  return {
    rootDir: resolvedRoot,
    fileCount: entries.length,
    files: entries,
    combinedHash: combinedHasher.digest("hex"),
  };
}

/** Convenience helper: hash a directory and return only the combined digest. */
export async function computeCombinedHash(dirPath: string): Promise<string> {
  const result = await hashDirectory(dirPath);
  return result.combinedHash;
}