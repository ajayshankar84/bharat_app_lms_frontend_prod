import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CreateCourseRoutingModule } from './create-course-routing.module';
import { CreateCourseComponent } from './create-course.component';

@NgModule({
  imports: [
    CommonModule,
    CreateCourseRoutingModule,
    ReactiveFormsModule,
    CreateCourseComponent
  ]
})
export class CreateCourseModule { }