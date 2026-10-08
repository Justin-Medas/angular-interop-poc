import ci from '../../../config/ci/config.json';
import docker from '../../../config/docker/config.json';
import local from '../../../config/local/config.json';
import { parseRuntimeConfig } from './runtime-config';

describe('FR10 shipped config files', () => {
  it.each([
    ['local', local],
    ['docker', docker],
    ['ci', ci],
  ])('FR10 NFR-ARCH5 config/%s/config.json matches the runtime-config schema', (_env, file) => {
    expect(() => parseRuntimeConfig(file)).not.toThrow();
  });

  it('FR10 the ci config is deterministic: in-memory interop and no polling (testing.md §5)', () => {
    expect(ci.interop.provider).toBe('in-memory');
    expect(ci.quotes.pollIntervalMs).toBe(0);
  });
});
