import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Toaster } from '../core/toast/toaster';

export const numericIdGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const toaster = inject(Toaster);
  const id = route.paramMap.get('id');
  if (!id || !/^[1-9]\d*$/.test(id)) {
    toaster.error('Invalid sensor ID. Redirecting to sensors list.');
    return router.createUrlTree(['/sensors']);
  }
  return true;
};
