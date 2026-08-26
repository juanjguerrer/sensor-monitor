import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./sensors/sensors').then((m) => m.Sensors),
  }
];
