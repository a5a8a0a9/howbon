import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('application routes', () => {
  it('defines four lazy-loaded feature tabs', async () => {
    const featureRoutes = routes.filter((route) => route.loadComponent);

    expect(featureRoutes.map((route) => route.path)).toEqual([
      'home',
      'journal',
      'rewards',
      'store',
    ]);

    for (const route of featureRoutes) {
      await expect(route.loadComponent!()).resolves.toBeTypeOf('function');
    }
  });

  it('redirects empty and unknown paths to home', () => {
    expect(routes.find((route) => route.path === '')?.redirectTo).toBe('home');
    expect(routes.find((route) => route.path === '**')?.redirectTo).toBe('home');
  });
});
