import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CourseDetailComponent } from './course-detail.component';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';
import { SplitPipe } from '../../shared/pipes/split.pipe';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: CourseDetailComponent,
      },
    ]),
    CourseDetailComponent,
    ImagePathPipe,
    SplitPipe
  ],
})
export class CourseDetailModule {}
