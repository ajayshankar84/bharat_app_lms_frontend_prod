import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { RecommendedCoursesComponent } from './recommended-courses.component';

@NgModule({
  declarations: [RecommendedCoursesComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: RecommendedCoursesComponent,
      },
    ]),
  ],
})
export class RecommendedCoursesModule {}
