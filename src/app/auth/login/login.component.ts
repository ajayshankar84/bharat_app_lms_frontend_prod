import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, Theme } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  themeService = inject(ThemeService);

  mobileForm!: FormGroup;
  otpForm!: FormGroup;

  step: 'mobile' | 'otp' = 'mobile';
  isSubmitting = false;
  isAutoFilling = false;
  errorMessage = '';
  successMessage = '';
  otpSession = '';
  currentPhone = '';

  private autoFillTimer: any = null;
  private autoSubmitTimer: any = null;

  get phone(): AbstractControl | null {
    return this.mobileForm.get('phone');
  }

  get otp(): AbstractControl | null {
    return this.otpForm.get('otp');
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.authService.getDashboardRoute()]);
      return;
    }

    this.mobileForm = this.fb.group({
      phone: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(10),
          Validators.pattern(/^[1-9][0-9]{9}$/),
        ],
      ],
    });

    this.otpForm = this.fb.group({
      otp: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
          Validators.pattern(/^[0-9]{6}$/),
        ],
      ],
    });
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  onSendOtp(): void {
    if (this.mobileForm.invalid) {
      this.mobileForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const phone = this.mobileForm.value.phone;

    this.authService.sendOtp(phone).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.otpSession = res.otpSession;
          this.currentPhone = phone;
          this.step = 'otp';
          this.successMessage = res.message || 'OTP sent successfully';
          this.simulateDisplayOtp();
        } else {
          this.errorMessage = res.message || 'Failed to send OTP';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message || 'Something went wrong. Please try again.';
      },
    });
  }

  private generateRandomOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private simulateDisplayOtp(): void {
    this.clearTimers();
    this.isAutoFilling = true;

    this.autoFillTimer = setTimeout(() => {
      const randomOtp = this.generateRandomOtp();
      this.otpForm.patchValue({ otp: randomOtp });
      this.isAutoFilling = false;

      this.autoSubmitTimer = setTimeout(() => {
        if (this.otpForm.valid && !this.isSubmitting) {
          this.onVerifyOtp();
        }
      }, 2000);
    }, 2000);
  }

  private clearTimers(): void {
    if (this.autoFillTimer) {
      clearTimeout(this.autoFillTimer);
      this.autoFillTimer = null;
    }
    if (this.autoSubmitTimer) {
      clearTimeout(this.autoSubmitTimer);
      this.autoSubmitTimer = null;
    }
    this.isAutoFilling = false;
  }

  onVerifyOtp(): void {
    this.clearTimers();

    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = {
      phone: this.currentPhone,
      firebaseToken: 'web-firebase-token',
      deviceInfo: {
        deviceName: navigator.userAgent || 'Web Browser',
      },
    };

    this.authService.verifyOtp(payload, this.otpSession).subscribe({
      next: (res) => {
        if (res.success) {
          this.authService.fetchMyInfo().subscribe({
            next: () => {
              this.isSubmitting = false;
              this.router.navigate([this.authService.getDashboardRoute()]);
            },
            error: () => {
              this.isSubmitting = false;
              this.router.navigate([this.authService.getDashboardRoute()]);
            },
          });
        } else {
          this.isSubmitting = false;
          this.errorMessage = res.message || 'Invalid OTP';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'OTP verification failed';
      },
    });
  }

  onChangeNumber(): void {
    this.clearTimers();
    this.step = 'mobile';
    this.otpForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
    this.otpSession = '';
  }

  onResendOtp(): void {
    this.clearTimers();
    this.otpForm.reset();
    this.errorMessage = '';

    this.isSubmitting = true;
    this.authService.sendOtp(this.currentPhone).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.otpSession = res.otpSession;
          this.successMessage = 'OTP resent successfully';
          this.simulateDisplayOtp();
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Failed to resend OTP';
      },
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }
}
