import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GET_AGENT } from './get-agent';

describe('GET_AGENT', () => {
  it('FR2 defaults to the real FDC3 getAgent, which rejects when no Desktop Agent answers', async () => {
    await expect(TestBed.inject(GET_AGENT)({ timeoutMs: 50 })).rejects.toBeDefined();
  });
});
