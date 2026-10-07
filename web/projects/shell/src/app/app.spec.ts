import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('NFR-ARCH1 App', () => {
  it('NFR-ARCH1 hosts a router outlet', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const el: HTMLElement = TestBed.createComponent(App).nativeElement;
    expect(el).toBeTruthy();
  });
});
