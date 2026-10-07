import { TestBed } from '@angular/core/testing';
import { DetailPage } from './detail-page';

describe('NFR-ARCH1 DetailPage', () => {
  it('NFR-ARCH1 renders a main landmark with an h1 "Instrument Detail"', () => {
    const el: HTMLElement = TestBed.createComponent(DetailPage).nativeElement;
    expect(el.querySelector('main > h1')?.textContent).toBe('Instrument Detail');
  });
});
