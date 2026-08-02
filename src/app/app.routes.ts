import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    title: '首頁｜好棒棒集章',
    loadComponent: () =>
      import('./features/stamps/pages/home/home-page.component').then((module) => module.default),
  },
  {
    path: 'journal',
    title: '日誌｜好棒棒集章',
    loadComponent: () =>
      import('./features/stamps/pages/journal/journal-page.component').then(
        (module) => module.default,
      ),
  },
  {
    path: 'rewards',
    title: '獎賞｜好棒棒集章',
    loadComponent: () =>
      import('./features/rewards/pages/rewards/rewards-page.component').then(
        (module) => module.default,
      ),
  },
  {
    path: 'store',
    title: '商店｜好棒棒集章',
    loadComponent: () =>
      import('./features/rewards/pages/store/store-page.component').then(
        (module) => module.default,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' },
];
