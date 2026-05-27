import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
//import { ReactiveFormsModule, FormsModule } from '@angular/forms';
 import { DragDropModule } from '@angular/cdk/drag-drop'; // Import DragDropModule
 import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';

import { CourseContentComponent } from './course-content.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: CourseContentComponent,
        // canActivate: [roleGuard],
        // data: { roles: ['admin'] }
      },
    ]),
    // ReactiveFormsModule, // Assuming these are already here or needed for forms
    // FormsModule,         // Assuming these are already here or needed for forms
    DragDropModule,       // Add DragDropModule here
    CourseContentComponent,
    ImagePathPipe
  ],
})
export class CourseContentModule { }