import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
    resetForm: FormGroup;
    email: string = '';
    otp: string = '';
    loading = false;
    successMessage = '';
    errorMessage = '';
    showPassword = false;
    showConfirmPassword = false;

    passwordStrength = 0;
    strengthLabel = '';
    strengthClass = '';

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService
    ) {
        this.resetForm = this.fb.group(
            {
                password: ['', [
                    Validators.required,
                    Validators.minLength(8),
                    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
                ]],
                confirmPassword: ['', [Validators.required]],
            },
            { validators: this.passwordMatchValidator }
        );
    }

    ngOnInit() {
        this.email = this.route.snapshot.queryParams['email'] || '';
        this.otp = this.route.snapshot.queryParams['otp'] || '';

        if (!this.email || !this.otp) {
            this.router.navigate(['/auth/forget-password']);
        }

        this.resetForm.get('password')?.valueChanges.subscribe((val) => {
            this.calculateStrength(val);
        });
    }

    passwordMatchValidator(control: AbstractControl) {
        const password = control.get('password');
        const confirmPassword = control.get('confirmPassword');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setErrors({ mismatch: true });
        } else {
            if (confirmPassword?.hasError('mismatch')) {
                confirmPassword.setErrors(null);
            }
        }
        return null;
    }

    calculateStrength(password: string) {
        let score = 0;
        if (!password) {
            this.passwordStrength = 0;
            this.strengthLabel = '';
            this.strengthClass = '';
            return;
        }

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[@$!%*?&]/.test(password)) score++;

        this.passwordStrength = Math.min(score, 5);

        const levels = [
            { label: 'Very Weak', cls: 'very-weak' },
            { label: 'Weak', cls: 'weak' },
            { label: 'Fair', cls: 'fair' },
            { label: 'Strong', cls: 'strong' },
            { label: 'Very Strong', cls: 'very-strong' },
        ];

        const idx = Math.max(0, this.passwordStrength - 1);
        this.strengthLabel = levels[idx].label;
        this.strengthClass = levels[idx].cls;
    }

    get passwordValue(): string {
        return this.resetForm.get('password')?.value || '';
    }

    get hasMinLength(): boolean {
        return this.passwordValue.length >= 8;
    }

    get hasUppercase(): boolean {
        return /[A-Z]/.test(this.passwordValue);
    }

    get hasLowercase(): boolean {
        return /[a-z]/.test(this.passwordValue);
    }

    get hasNumber(): boolean {
        return /\d/.test(this.passwordValue);
    }

    get hasSpecialChar(): boolean {
        return /[@$!%*?&]/.test(this.passwordValue);
    }

    togglePassword() {
        this.showPassword = !this.showPassword;
    }

    toggleConfirmPassword() {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    onSubmit() {
        if (this.resetForm.invalid) return;

        this.loading = true;
        this.successMessage = '';
        this.errorMessage = '';

        const { password, confirmPassword } = this.resetForm.value;

        this.authService.resetPassword(this.email, this.otp, password, confirmPassword).subscribe({
            next: () => {
                this.successMessage = 'Password reset successfully! Redirecting to login...';
                this.loading = false;

                setTimeout(() => {
                    this.router.navigate(['/auth/login']);
                }, 2500);
            },
            error: (err) => {
                this.errorMessage = err.error?.message || 'Failed to reset password. Please try again.';
                this.loading = false;
            },
        });
    }
}