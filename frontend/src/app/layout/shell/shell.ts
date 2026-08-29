import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Session } from '../../core/auth/session';
import { AuthApi } from '../../core/auth/auth-api';

@Component({
  imports: [
    Header,
    RouterOutlet,
  ],
  selector: 'app-shell',
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell implements OnInit {
  private readonly session = inject(Session);
  private readonly authApi = inject(AuthApi);
  ngOnInit() {
    if (this.session.isAuthenticated() && !this.session.user()) {
      this.authApi.me().subscribe({
        next: (user) => this.session.setUser(user),
        error: (err) => {
          console.error('Failed to fetch user data:', err);
          this.session.logout();
        }
      });
    }
  }
}
