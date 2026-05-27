import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    effect(() => {
      const current = this.theme();
      document.body.classList.toggle('dark', current === 'dark');
      localStorage.setItem('app-theme', current);
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  setTheme(t: Theme): void {
    this.theme.set(t);
  }

  private getInitialTheme(): Theme {
    const stored = localStorage.getItem('app-theme') as Theme | null;
    return stored ?? 'light';
  }
}
