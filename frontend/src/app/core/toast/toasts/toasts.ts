import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toaster } from '../toaster';

@Component({
  imports: [],
  selector: 'app-toasts',
  styleUrl: './toasts.scss',
  templateUrl: './toasts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toasts {
  private readonly toaster = inject(Toaster);
  protected readonly toasts = this.toaster.toasts;

  protected dismiss(id: number) {
    this.toaster.dismiss(id);
  }
}
