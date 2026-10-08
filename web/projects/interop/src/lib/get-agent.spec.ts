import { TestBed } from '@angular/core/testing';
import { getAgent } from '@finos/fdc3';
import { describe, expect, it } from 'vitest';
import { GET_AGENT } from './get-agent';

describe('GET_AGENT', () => {
  it('FR2 defaults to the real FDC3 getAgent', () => {
    expect(TestBed.inject(GET_AGENT)).toBe(getAgent);
  });
});
