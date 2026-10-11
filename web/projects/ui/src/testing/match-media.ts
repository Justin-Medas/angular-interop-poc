// Test setup stub (loaded by the ui and shell unit-test targets).
/** jsdom has no matchMedia. Tests start with "no preference"; specs stub reduced motion explicitly. */
globalThis.matchMedia = (query: string) => ({ matches: false, media: query }) as MediaQueryList;
