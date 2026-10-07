/** The token tests read tokens.css from disk; declare just that one Node API instead of adding @types/node. */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
