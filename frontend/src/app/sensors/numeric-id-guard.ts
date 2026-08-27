import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const numericIdGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const id = route.paramMap.get('id');
  if (!id || !/^[1-9]\d*$/.test(id)) {
    return router.createUrlTree(['/sensors']);
  }
  return true;
};
