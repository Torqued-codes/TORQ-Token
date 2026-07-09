export interface DependencyManifestEntry {
  /** Package name, must match the name registered on-chain */
  name: string;
  /** Version string, must match the version registered on-chain */
  version: string;
  /** Path to the local directory to hash, relative to the project root */
  path: string;
}

export interface DependencyManifest {
  dependencies: DependencyManifestEntry[];
}