import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';
import { inject } from '@angular/core/primitives/di';

export const authGuard: CanActivateFn = (_, state) => {
  const session = inject(Session);
  const router = inject(Router);

  if (session.isAuthenticated()) return true;
  session.logout();
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);

  return session.isAuthenticated() ? router.createUrlTree(['/sensors']) : true;
};