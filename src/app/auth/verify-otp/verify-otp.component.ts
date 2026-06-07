import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-verify-otp',
    templateUrl: './verify-otp.component.html',
    styleUrls: ['./verify-otp.component.scss'],
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
    @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

    otpForm: FormGroup;
    email: string = '';
    loading = false;
    resending = false;
    successMessage = '';
    errorMessage = '';

    countdown = 60;
    canResend = false;
    timerSub?: Subscription;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService
    ) {
        this.otpForm = this.fb.group({
            otp1: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
            otp2: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
            otp3: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
            otp4: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
            otp5: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
            otp6: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
        });
    }

    ngOnInit() {
        this.email = this.route.snapshot.queryParams['email'] || '';

        if (!this.email) {
            this.router.navigate(['/auth/forget-password']);
            return;
        }

        this.startTimer();
    }

    ngOnDestroy() {
        this.timerSub?.unsubscribe();
    }

    startTimer() {
        this.countdown = 60;
        this.canResend = false;
        this.timerSub?.unsubscribe();

        this.timerSub = interval(1000)
            .pipe(take(60))
            .subscribe({
                next: (val) => {
                    this.countdown = 59 - val;
                },
                complete: () => {
                    this.canResend = true;
                },
            });
    }

    get maskedEmail(): string {
        if (!this.email) return '';
        const [name, domain] = this.email.split('@');
        const masked = name.substring(0, 2) + '***';
        return `${masked}@${domain}`;
    }

    onInput(event: any, index: number) {
        const value = event.target.value;

        if (value.length > 1) {
            event.target.value = value.charAt(value.length - 1);
            this.otpForm.get(`otp${index}`)?.setValue(event.target.value);
        }

        if (value && index < 6) {
            const inputs = this.otpInputs.toArray();
            inputs[index]?.nativeElement.focus();
        }
    }

    onKeyDown(event: KeyboardEvent, index: number) {
        if (event.key === 'Backspace') {
            const currentValue = this.otpForm.get(`otp${index}`)?.value;

            if (!currentValue && index > 1) {
                const inputs = this.otpInputs.toArray();
                inputs[index - 2]?.nativeElement.focus();
            }
        }
    }

    onPaste(event: ClipboardEvent) {
        event.preventDefault();
        const paste = event.clipboardData?.getData('text') || '';
        const digits = paste.replace(/\D/g, '').substring(0, 6);

        if (digits.length === 6) {
            const inputs = this.otpInputs.toArray();
            digits.split('').forEach((digit, i) => {
                this.otpForm.get(`otp${i + 1}`)?.setValue(digit);
                if (inputs[i]) {
                    inputs[i].nativeElement.value = digit;
                }
            });
            inputs[5]?.nativeElement.focus();
        }
    }

    getFullOtp(): string {
        return [1, 2, 3, 4, 5, 6]
            .map((i) => this.otpForm.get(`otp${i}`)?.value || '')
            .join('');
    }

    onSubmit() {
        const otp = this.getFullOtp();

        if (otp.length !== 6) {
            this.errorMessage = 'Please enter complete 6-digit OTP.';
            return;
        }

        this.loading = true;
        this.successMessage = '';
        this.errorMessage = '';

        this.authService.verifyOtp(this.email, otp).subscribe({
            next: (res) => {
                this.successMessage = 'OTP verified successfully!';
                this.loading = false;

                setTimeout(() => {
                    this.router.navigate(['/auth/reset-password'], {
                        queryParams: { email: this.email, otp: otp },
                    });
                }, 1500);
            },
            error: (err) => {
                this.errorMessage = err.error?.message || 'Invalid OTP. Please try again.';
                this.loading = false;

                [1, 2, 3, 4, 5, 6].forEach((i) => this.otpForm.get(`otp${i}`)?.setValue(''));
                const inputs = this.otpInputs.toArray();
                inputs[0]?.nativeElement.focus();
            },
        });
    }

    resendOtp() {
        if (!this.canResend) return;

        this.resending = true;
        this.successMessage = '';
        this.errorMessage = '';

        this.authService.resendOtp(this.email).subscribe({
            next: () => {
                this.successMessage = 'New OTP sent to your email!';
                this.resending = false;
                this.startTimer();
            },
            error: (err) => {
                this.errorMessage = err.error?.message || 'Failed to resend OTP.';
                this.resending = false;
            },
        });
    }
}