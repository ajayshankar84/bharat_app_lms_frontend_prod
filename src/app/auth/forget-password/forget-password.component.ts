import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrls: ['./forget-password.component.scss'],
})
export class ForgetPasswordComponent {
  forgotForm: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/)
      ]]
    });
  }

  onSubmit() {
    if (this.forgotForm.invalid) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const email = this.forgotForm.get('email')?.value;

    this.authService.sendOtp(email).subscribe({
      next: (res) => {
        this.successMessage = 'OTP sent successfully to your email!';
        this.loading = false;

        // Navigate to OTP verify page after 1.5 sec
        setTimeout(() => {
          this.router.navigate(['/auth/verify-otp'], {
            queryParams: { email: email }
          });
        }, 1500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Unable to send OTP. Please try again.';
        this.loading = false;
      }
    });
  }
}