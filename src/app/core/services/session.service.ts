import { Injectable } from '@angular/core';

const AUTH_TOKEN_KEY = 'auth-token';
const SESSION_TOKEN_KEY = 'session-token';
const SESSION_ROLE_KEY = 'session-role';
const USER_INFO_KEY = 'user-info';

@Injectable({ providedIn: 'root' })
export class SessionService {
  setAuthToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  setSessionToken(token: string): void {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    const role = this.getRoleFromToken(token);

    if (role) {
      this.setRole(role);
    }
  }

  getSessionToken(): string | null {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }

  setRole(role: string | null): void {
    if (!role) {
      localStorage.removeItem(SESSION_ROLE_KEY);
      return;
    }

    localStorage.setItem(SESSION_ROLE_KEY, role);
  }

  getRole(): string | null {
    const storedRole = localStorage.getItem(SESSION_ROLE_KEY);
    if (storedRole) {
      return storedRole;
    }

    const token = this.getSessionToken();
    if (!token) {
      return null;
    }

    const role = this.getRoleFromToken(token);
    if (role) {
      this.setRole(role);
    }

    return role;
  }

  getDashboardRoute(): string {
    return this.isAdmin() ? '/dashboard/dashboard-v2' : '/dashboard/dashboard-v1';
  }

  setUserInfo(info: any): void {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
  }

  getUserInfo<T = any>(): T | null {
    const raw = localStorage.getItem(USER_INFO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    return (this.getRole() || '').toLowerCase() === 'admin';
  }

  isLoggedIn(): boolean {
    return !!this.getSessionToken();
  }

  clear(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_ROLE_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  }

  private getRoleFromToken(token: string): string | null {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
      const decoded = atob(paddedPayload);
      const parsed = JSON.parse(decoded) as { role?: string };
      return parsed.role ?? null;
    } catch {
      return null;
    }
  }
}
