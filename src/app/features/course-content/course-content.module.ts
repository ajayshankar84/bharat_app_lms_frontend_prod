import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CourseContentComponent } from './course-content.component';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: CourseContentComponent }]),
    CourseContentComponent,
    ImagePathPipe,
  ],
})
export class CourseContentModule {}
