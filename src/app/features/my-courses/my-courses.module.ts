import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MyCoursesComponent } from './my-courses.component';

@NgModule({
  declarations: [MyCoursesComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: MyCoursesComponent,
      },
    ]),
  ],
})
export class MyCoursesModule {}
