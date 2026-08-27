import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Session } from '../../core/auth/session';
import { Apollo } from 'apollo-angular';

@Component({
  imports: [
    RouterLink,
  ],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly session = inject(Session);
  private readonly apollo = inject(Apollo);
  private readonly router = inject(Router);
  protected readonly loggingOut = signal(false);

  protected async logout() {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      this.session.logout();
      await this.apollo.client.clearStore().catch(() => {});
      await this.router.navigateByUrl('/login');
    } finally {
      this.loggingOut.set(false);
    }
  }
}
