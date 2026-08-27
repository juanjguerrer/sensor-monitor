import { inject } from "@angular/core";
import { Session } from "../auth/session";
import { Router } from "@angular/router";
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';

export function createErrorLink() {
  const session = inject(Session);
  const router = inject(Router);
  return new ErrorLink(({ error }) => {
    if (!CombinedGraphQLErrors.is(error)) return;

    const expired = error.errors.some((e) => e.extensions?.['code'] === 'UNAUTHENTICATED');
    if (!expired) return;
    session.logout();
    router.navigate(['/login']);
  })
}