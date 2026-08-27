import { computed, Service, signal } from '@angular/core';
import { decodeJwt } from './decode-jwt';

const TOKEN_KEY = 'AUTH_TOKEN';
@Service()
export class Session {
  private readonly _token = signal(localStorage.getItem(TOKEN_KEY));
  readonly token = this._token.asReadonly();
  private readonly payload = computed(() => decodeJwt(this._token()));
  readonly isAuthenticated = computed(() => {
    const exp = this.payload()?.exp;
    return exp !== undefined && exp * 1000 > Date.now();
  });
  setToken(token: string) {
    this._token.set(token);
    localStorage.setItem(TOKEN_KEY, token);
  }
  logout() {
    this._token.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }
}
