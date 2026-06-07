import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VerifyOtpComponent } from './verify-otp.component';

@NgModule({
    declarations: [VerifyOtpComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule.forChild([
            { path: '', component: VerifyOtpComponent }
        ]),
    ],
})
export class VerifyOtpModule { }