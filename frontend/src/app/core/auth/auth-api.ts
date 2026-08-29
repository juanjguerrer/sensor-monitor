import { inject, Service } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { GetMeDocument, GetMeQuery, LoginDocument, LoginMutation } from '../../generated/graphql';
import { Observable, map } from 'rxjs';

export type AuthUser = GetMeQuery['me'];
export type LoginResult = LoginMutation['login'];

@Service()
export class AuthApi {
  private readonly apollo = inject(Apollo);
  login(username: string, password: string) : Observable<LoginResult> {
    return this.apollo.mutate({
      mutation: LoginDocument,
      variables: {
        username,
        password
      }
    }).pipe(map((result) => {
      const login = result.data?.login;
      if (!login) {
        throw new Error('Login failed: No token or user returned');
      }
      return login;
    }));
  }

  me (): Observable<AuthUser> {
    return this.apollo.query({
      query: GetMeDocument,
      fetchPolicy: 'network-only'
    }).pipe(map((result) => {
      const user = result.data?.me;
      if (!user) {
        throw new Error('Me query failed: No user returned');
      }
      return user;
    }));
  }
}
