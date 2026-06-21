import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { anonGuard } from './core/anon.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [anonGuard],
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [anonGuard],
    loadComponent: () =>
      import('./features/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/feed/feed.component').then((m) => m.FeedComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'loop/:id',
    loadComponent: () =>
      import('./features/loop-detail/loop-detail.component').then((m) => m.LoopDetailComponent),
  },
  {
    path: 'export',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/export-gate/export-gate.component').then((m) => m.ExportGateComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
