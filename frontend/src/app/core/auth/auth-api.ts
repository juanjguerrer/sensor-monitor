import { inject, Service } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { LoginDocument } from '../../generated/graphql';
import { Observable, map } from 'rxjs';

@Service()
export class AuthApi {
  private readonly apollo = inject(Apollo);
  login(username: string, password: string) : Observable<string> {
    return this.apollo.mutate({
      mutation: LoginDocument,
      variables: {
        username,
        password
      }
    }).pipe(map((result) => {
      const token = result.data?.login.token;
      if (!token) {
        throw new Error('Login failed: No token returned');
      }
      return token;
    }));
  }
}
