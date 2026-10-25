import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { LoginResponse, Role, User } from '../models';

const TOKEN_KEY = 'fulfillhub.token';
const USER_KEY = 'fulfillhub.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Zalogowany użytkownik w signalu – menu i przyciski reagują na niego bez subskrypcji.
  private readonly currentUser = signal<User | null>(readStoredUser());

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly role = computed(() => this.currentUser()?.role ?? null);

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>('/api/auth/login', { email, password })
      .pipe(tap((response) => this.store(response)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    void this.router.navigate(['/logowanie']);
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.currentUser()?.role;

    return role !== undefined && roles.includes(role);
  }

  private store(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.currentUser.set(response.user);
  }
}

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    // Uszkodzony wpis w localStorage nie może wywalić startu aplikacji.
    localStorage.removeItem(USER_KEY);
    return null;
  }
}
