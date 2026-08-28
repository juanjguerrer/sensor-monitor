import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard';
import { numericIdGuard } from './sensors/numeric-id-guard';

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
        loadComponent: () => import('./sensors/sensors-list/sensors-list').then((m) => m.SensorsList),
      },
      {
        path: 'sensors/new',
        loadComponent: () => import('./sensors/sensor-form/sensor-form').then((m) => m.SensorForm),
      },
      {
        path: 'sensors/:id',
        loadComponent: () => import('./sensors/sensor-detail/sensor-detail').then((m) => m.SensorDetail),
        canActivate: [numericIdGuard]
      },
      {
        path: 'sensors/:id/edit',
        loadComponent: () => import('./sensors/sensor-form/sensor-form').then((m) => m.SensorForm),
        canActivate: [numericIdGuard]
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