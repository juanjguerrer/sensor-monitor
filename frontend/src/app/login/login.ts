import { Component, inject, signal } from '@angular/core';
import {form, FormField, required, submit} from '@angular/forms/signals';
import { AuthApi } from '../core/auth/auth-api';
import { Session } from '../core/auth/session';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { CombinedGraphQLErrors } from '@apollo/client/errors';

interface LoginData {
  username: string;
  password: string;
}

@Component({
  imports: [
    FormField
  ],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  authApi = inject(AuthApi);
  session = inject(Session);
  router = inject(Router);

  loginModel = signal<LoginData>({
    username: '',
    password: '',
  });
  loginForm = form(this.loginModel,(p) => {
    required(p.username, { message: 'Username is required' });
    required(p.password, { message: 'Password is required' });
  });
  protected readonly errorMessage = signal<string | null>(null);

  async onSubmit(event: SubmitEvent) {
    event.preventDefault();
    this.errorMessage.set(null);

    await submit(this.loginForm, async () => {
    const { username, password } = this.loginModel();
    try {
      const token = await firstValueFrom(this.authApi.login(username, password));
      this.session.setToken(token);
      await this.router.navigateByUrl('/sensors');
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage.set(
          CombinedGraphQLErrors.is(error)
            ? 'Invalid username or password'
            : 'Could not reach the server. Please try again.',
        );
    }
  });
  }
}
