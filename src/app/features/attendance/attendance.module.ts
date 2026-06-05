import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceComponent } from './attendance.component';
import { RouterModule } from '@angular/router';

@NgModule({
 imports: [
    CommonModule,
    FormsModule,
    AttendanceComponent,
    RouterModule.forChild([
      {
        path: '',
        component: AttendanceComponent,
      },
    ]),
  ],
})
export class AttendanceModule {}