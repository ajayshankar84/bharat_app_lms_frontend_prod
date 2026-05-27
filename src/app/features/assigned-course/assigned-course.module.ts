import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AssignedCourseComponent } from './assigned-course.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AssignedCourseComponent,
    RouterModule.forChild([
      {
        path: '',
        component: AssignedCourseComponent,
      },
    ]),
  ],
})
export class AssignedCourseModule {}
