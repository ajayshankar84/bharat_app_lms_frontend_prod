import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
  ADMIN_MOBILE,
  USER_LOGIN_SEND_OTP,
  USER_LOGIN_VERIFY_OTP,
  USER_MY_INFO,
} from '../config/api.config';
import { SessionService } from './session.service';

export interface SendOtpResponse {
  message: string;
  success: boolean;
  isNewUser: boolean;
  hasPasswordEnabled: boolean;
  passwordLoginEnabled: boolean;
  otpSession: string;
}

export interface VerifyOtpResponse {
  message: string;
  success: boolean;
  passwordRequired: boolean;
  authToken: string;
  sessionToken: string;
}

export interface VerifyOtpPayload {
  phone: string;
  firebaseToken: string;
  deviceInfo: {
    deviceName: string;
  };
}

export interface UserInfo {
  _id: string;
  username: string;
  phone: string;
  name?: string;
  email?: string;
  profileImage?: string;
  district?: string;
  state?: string;
  profession?: string;
  bio?: string;
  gender?: string;
  [key: string]: any;
}

const HARDCODED_OTP = '100000';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private session = inject(SessionService);

  private currentUserSubject = new BehaviorSubject<UserInfo | null>(
    this.session.getUserInfo<UserInfo>(),
  );

  currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  sendOtp(phone: string): Observable<SendOtpResponse> {
    return this.http.post<SendOtpResponse>(USER_LOGIN_SEND_OTP, { phone });
  }

  verifyOtp(
    payload: VerifyOtpPayload,
    otpSession: string,
  ): Observable<VerifyOtpResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${otpSession}`,
    });

    const finalPayload = {
      ...payload,
      otp: HARDCODED_OTP,
    };

    return this.http
      .post<VerifyOtpResponse>(USER_LOGIN_VERIFY_OTP, finalPayload, { headers })
      .pipe(
        tap((res) => {
          if (res.success) {
            this.session.setAuthToken(res.authToken);
            this.session.setSessionToken(res.sessionToken);
            this.session.setIsAdmin(payload.phone === ADMIN_MOBILE);
          }
        }),
      );
  }

  fetchMyInfo(): Observable<UserInfo> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.session.getSessionToken()}`,
    });
    return this.http.get<UserInfo>(USER_MY_INFO, { headers }).pipe(
      tap((info) => {
        this.session.setUserInfo(info);
        this.currentUserSubject.next(info);
      }),
    );
  }

  isAuthenticated(): boolean {
    return this.session.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.session.isAdmin();
  }

  logout(): void {
    this.session.clear();
    this.currentUserSubject.next(null);
  }
}
