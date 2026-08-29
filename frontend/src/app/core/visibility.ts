import { DestroyRef, inject, Service, signal } from '@angular/core';

@Service()
export class Visibility {
  private readonly _visible = signal(document.visibilityState === 'visible');
  readonly visible = this._visible.asReadonly();
  constructor() {
    const onChange = () => {
      this._visible.set(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', onChange);

    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onChange);
    });
  }
}
