import { contrast, luminance } from './contrast';

describe('NFR-DS4 contrast helper', () => {
  it('black on white is 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('is symmetric', () => {
    expect(contrast('#ffffff', '#767676')).toBeCloseTo(contrast('#767676', '#ffffff'), 10);
  });

  it('uses the linear segment for very dark channels', () => {
    expect(luminance('#010101')).toBeCloseTo(1 / 255 / 12.92, 6);
  });
});
