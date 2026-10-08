import { TestBed } from '@angular/core/testing';
import { BlotterPage } from './blotter-page';

describe('NFR-ARCH1 BlotterPage', () => {
  it('NFR-ARCH1 renders a main landmark with an h1 "Blotter"', () => {
    const el: HTMLElement = TestBed.createComponent(BlotterPage).nativeElement;
    expect(el.querySelector('main > h1')?.textContent).toBe('Blotter');
  });
});
