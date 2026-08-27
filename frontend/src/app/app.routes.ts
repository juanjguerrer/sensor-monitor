import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [ guestGuard ],
  },
  {
    path: 'sensors',
    loadComponent: () => import('./sensors/sensors-list').then((m) => m.SensorsList),
    canActivate: [ authGuard ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'sensors',
  },
  {
    path: '**',
    redirectTo: 'sensors',
  }
];
