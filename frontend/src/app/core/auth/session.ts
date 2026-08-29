import { computed, Service, signal } from '@angular/core';
import { decodeJwt } from './decode-jwt';
import type { AuthUser } from './auth-api';

const TOKEN_KEY = 'AUTH_TOKEN';
@Service()
export class Session {
  private readonly _token = signal(localStorage.getItem(TOKEN_KEY));
  readonly token = this._token.asReadonly();
  private readonly payload = computed(() => decodeJwt(this._token()));
  private readonly _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly()

  isAuthenticated (): boolean {
    const exp = this.payload()?.exp;
    return exp !== undefined && exp * 1000 > Date.now();
  };
  setToken(token: string) {
    this._token.set(token);
    localStorage.setItem(TOKEN_KEY, token);
  }

  setUser (user: AuthUser) {
    this._user.set(user);
  }

  logout() {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }
}
