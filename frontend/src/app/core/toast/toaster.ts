import { Service, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  kind: 'success' | 'error' | 'info';
}

let nextId = 1;
@Service()
export class Toaster {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show (toast: Omit<Toast, 'id'>) {
    const id = nextId++;
    this._toasts.update((toasts) => [...toasts, { ...toast, id }]);
    if (toast.kind !== 'error') {
      setTimeout(() => this.dismiss(id), 5000);
    }
  }

  success (text: string) {
    this.show({ text, kind: 'success' });
  }

  error (text: string) {
    this.show({ text, kind: 'error' });
  }

  info (text: string) {
    this.show({ text, kind: 'info' });
  }

  dismiss(id: number) {
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
