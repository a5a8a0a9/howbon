import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { provideRouter, Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { LoadingService } from './core/loading/loading.service';
import { StampService } from './features/stamps/data-access/stamp.service';

function swUpdateStub() {
  return {
    isEnabled: false,
    versionUpdates: EMPTY,
    activateUpdate: () => Promise.resolve(true),
  };
}

describe('App', () => {
  it('renders the login gate while signed out', async () => {
    const authStub = {
      configured: true,
      authReady: signal(true),
      isSigningIn: signal(false),
      error: signal<string | null>(null),
      user: signal(null),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SwUpdate, useValue: swUpdateStub() },
        { provide: AuthService, useValue: authStub },
        provideRouter(routes),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('今天也要');
    expect(compiled.querySelector('.stamp-button')).toBeNull();
    expect(compiled.textContent).toContain('使用 Google 帳號登入');
  });

  it('renders the cloud dashboard for a signed-in user', async () => {
    const authStub = {
      configured: true,
      authReady: signal(true),
      isSigningIn: signal(false),
      error: signal<string | null>(null),
      user: signal({ uid: 'alice', displayName: '小明', photoURL: null }),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    };
    const stampStub = {
      currentStampCount: signal(0),
      badgeCount: signal(3),
      saving: signal(false),
      addStamp: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SwUpdate, useValue: swUpdateStub() },
        { provide: AuthService, useValue: authStub },
        { provide: StampService, useValue: stampStub },
        provideRouter(routes),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/not-a-page');
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.account-chip')?.textContent).toContain('小明');
    expect(compiled.querySelector('.header-ticket-pill')).toBeNull();
    expect(compiled.querySelector('.stamp-button')).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe('/home');
    expect(compiled.querySelector('.bottom-nav a.active')?.textContent).toContain('首頁');
    expect(compiled.querySelector('.badge-copy')?.getAttribute('aria-label')).toBe(
      '已收藏 3 枚徽章',
    );
  });

  it('blocks the application while a global action is running', async () => {
    const authStub = {
      configured: true,
      authReady: signal(true),
      isSigningIn: signal(false),
      error: signal<string | null>(null),
      user: signal(null),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SwUpdate, useValue: swUpdateStub() },
        { provide: AuthService, useValue: authStub },
        provideRouter(routes),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    TestBed.inject(LoadingService).begin('正在測試…');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app-shell')?.hasAttribute('inert')).toBe(true);
    expect(compiled.querySelector('.app-shell')?.getAttribute('aria-busy')).toBe('true');
    expect(compiled.querySelector('.loading-mask')?.textContent).toContain('正在測試…');
  });
});
