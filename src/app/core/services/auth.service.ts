import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { LMS_AUTH_ENDPOINT } from '../config/api.config';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  access_token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  private readonly API_URL =LMS_AUTH_ENDPOINT; // Adjust this to match your backend environment

  constructor(private http: HttpClient) {
    // Initialize with data from localStorage if available
    this.currentUserSubject = new BehaviorSubject<User | null>(
      JSON.parse(localStorage.getItem('lms-account-data') || 'null')
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  sendResetLink(email: string): Observable<any> {
    console.log(email);
    return this.http.post(`https://bharatapp-admin.praispranav.com/lms-auth/reset-password`, { email });
  }

  // resetPassword(password: string, token: string): Observable<any> {
  //   return this.http.post(`${this.API_URL}/reset-password`, { password, token });
  // }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public logout(): void {
    localStorage.removeItem('lms-account-data');
    this.currentUserSubject.next(null);
  }
}