// Patches the pinned FDC3 Sail checkout so its default app directories include this POC's AppD
// (SPEC FR2/FR3, docs/DECISIONS.md #42). Sail keeps directories in browser localStorage and hardcodes
// its defaults; it has no env or config hook, so a fresh browser would otherwise need a manual
// Settings > Directories step. Pure string logic lives here so it can be unit tested.

/** The directory URL served by the Go API (specs/fdc3-contract.md): Blotter and Detail app entries. */
export const POC_DIRECTORY_URL = 'http://localhost:8080/appd/v2/apps';

const ANCHOR = 'const DEFAULT_DIRECTORIES: Directory[] = [\n';

const ENTRY = `  {
    label: "POC Blotter and Detail",
    url: "${POC_DIRECTORY_URL}",
    active: true,
  },
`;

/**
 * Returns Sail's LocalStorageClientState.ts source with the POC directory first in DEFAULT_DIRECTORIES.
 * Idempotent, so `npm run setup` can be re-run. Throws when the anchor is missing: that means the pinned
 * SHA changed shape, and a silent skip would bring the manual step back unnoticed.
 */
export function withPocDirectory(source) {
  if (source.includes(POC_DIRECTORY_URL)) return source;
  if (!source.includes(ANCHOR)) {
    throw new Error('Sail source has no DEFAULT_DIRECTORIES array; update scripts/sail-patch.mjs for the new SHA');
  }
  return source.replace(ANCHOR, ANCHOR + ENTRY);
}
