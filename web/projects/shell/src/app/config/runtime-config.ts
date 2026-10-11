// Runtime configuration (FR10, NFR-ARCH5, DECISIONS #8). One build reads /config.json at startup and validates it
// against specs/runtime-config.schema.json, which is imported rather than copied so the spec cannot drift from the code.
// `auth` is a reserved seam and must stay `enabled: false`; no login is implemented.
import {
  EnvironmentProviders,
  inject,
  InjectionToken,
  Injectable,
  makeEnvironmentProviders,
  provideAppInitializer,
  signal,
} from '@angular/core';
import { Ajv2020, type ErrorObject } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@specs/runtime-config.schema.json';

/** The validated shape of /config.json (specs/runtime-config.schema.json). */
export interface RuntimeConfig {
  environment: 'local' | 'docker' | 'codespaces' | 'ci';
  apiBaseUrl: string;
  interop: { provider: 'fdc3' | 'in-memory'; connectTimeoutMs: number };
  theme?: 'dark' | 'light';
  quotes?: { pollIntervalMs: number };
  auth: {
    enabled: false;
    clientId: string;
    authority: string;
    redirectUri: string;
    cacheLocation: 'sessionStorage' | 'localStorage' | 'memory';
    scopes: string[];
  };
}

/** Thrown when /config.json is missing or invalid; carries every problem, not just the first. */
export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join('; '));
  }
}

// The schema in specs/ is the single source of truth: it is imported, not copied.
const validate = addFormats(new Ajv2020({ allErrors: true })).compile<RuntimeConfig>(schema);

/** Names the property for "additional property" errors, which otherwise do not say which one. */
const extra = (name: unknown) => (typeof name === 'string' ? `: ${name}` : '');

/** FR10: returns the config if it matches specs/runtime-config.schema.json, otherwise throws with every issue. */
export function parseRuntimeConfig(raw: unknown): RuntimeConfig {
  if (validate(raw)) return raw;
  throw new ConfigError(
    (validate.errors as ErrorObject[]).map(
      (e) => `${e.instancePath || '/'} ${e.message}${extra(e.params['additionalProperty'])}`,
    ),
  );
}

/** Holds the outcome of loading /config.json. The shell shows the error screen when `errors` is non-empty. */
@Injectable({ providedIn: 'root' })
export class RuntimeConfigStore {
  /** The validated config, or null before load and after a failed load. */
  readonly config = signal<RuntimeConfig | null>(null);
  /** Why loading failed; empty when it succeeded. */
  readonly errors = signal<string[]>([]);

  /** Never rejects: a failed bootstrap would leave a blank page. Failures become `errors` instead. */
  async load(): Promise<void> {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (!res.ok) throw new ConfigError([`GET /config.json returned HTTP ${res.status}`]);
      const body: unknown = await res.json().catch(() => {
        throw new ConfigError(['/config.json is not valid JSON']);
      });
      this.config.set(parseRuntimeConfig(body));
    } catch (e) {
      this.errors.set(
        e instanceof ConfigError
          ? e.issues
          : [`Could not fetch /config.json: ${(e as Error).message}`],
      );
    }
  }
}

/** Injection token for the validated config. Throws if read before a valid load, so nothing half-starts. */
export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG', {
  factory: () => {
    const config = inject(RuntimeConfigStore).config();
    if (!config) throw new Error('RUNTIME_CONFIG read before a valid /config.json was loaded');
    return config;
  },
});

/** Loads /config.json before the app bootstraps (app initializer). */
export function provideRuntimeConfig(): EnvironmentProviders {
  return makeEnvironmentProviders([provideAppInitializer(() => inject(RuntimeConfigStore).load())]);
}
