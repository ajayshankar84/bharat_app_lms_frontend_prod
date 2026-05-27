import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { LMS_AUTH_ENDPOINT } from '../config/api.config';

export interface AccountSubmissionPayload {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
}

export interface StoredAccountData {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile: string;
  isLoggedIn?: boolean;
  role?: string;
}

export interface AccountApiResponse {
  success: boolean;
  message?: string;
  data?: StoredAccountData;
}

@Injectable({
  providedIn: 'root',
})
export class AccountStateService {
  private readonly storageKey = 'lms-account-data';

  private readonly accountDataSubject = new BehaviorSubject<StoredAccountData | null>(
    this.loadStoredAccountData()
  );

  readonly accountData$ = this.accountDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  submitAccount(payload: AccountSubmissionPayload): Observable<AccountApiResponse> {
    const sanitizedForStorage: StoredAccountData = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      mobile: payload.mobile,
      isLoggedIn: false,
    };

    return this.http.post<AccountApiResponse>(LMS_AUTH_ENDPOINT, payload).pipe(
      tap((response) => {
        const storedData = this.normalizeAuthResponse(response, payload.mobile);
        this.setAccountData(storedData);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  loginWithMobile(mobile: string, password: string): Observable<AccountApiResponse> {
    const loginEndpoint = `${LMS_AUTH_ENDPOINT}/${mobile}`;

    return this.http.get<AccountApiResponse>(loginEndpoint).pipe(
      tap((response) => {
        const storedData = this.normalizeAuthResponse(response, mobile);
        this.setAccountData(storedData);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  private normalizeAuthResponse(response: AccountApiResponse | StoredAccountData | null | undefined, fallbackMobile: string): StoredAccountData {
    const payload = response && typeof response === 'object' && 'data' in response ? response.data : response;
    const user = (payload && typeof payload === 'object' && 'user' in payload ? (payload as { user?: StoredAccountData }).user : payload) as StoredAccountData | undefined;

    return {
      id: (user as any)?.id ?? (user as any)?._id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      mobile: user?.mobile || fallbackMobile,
      role: user?.role,
      isLoggedIn: true,
    };
  }

  setAccountData(data: StoredAccountData | null): void {
    this.accountDataSubject.next(data);

    if (typeof localStorage === 'undefined') {
      return;
    }

    if (!data) {
      localStorage.removeItem(this.storageKey);
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  getStoredAccountData(): StoredAccountData | null {
    return this.accountDataSubject.value;
  }

  private loadStoredAccountData(): StoredAccountData | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as StoredAccountData;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
  clearAccountData(): void {
    this.setAccountData(null);
  }
}
