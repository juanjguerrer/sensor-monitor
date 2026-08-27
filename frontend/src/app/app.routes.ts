import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      {
        path: 'sensors',
        loadComponent: () => import('./sensors/sensors-list').then((m) => m.SensorsList),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'sensors',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];