import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoursesRoutingModule } from './courses-routing.module';
import { CoursesComponent } from './courses.component';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';

@NgModule({
  declarations: [CoursesComponent],
  imports: [CommonModule, FormsModule, CoursesRoutingModule, ImagePathPipe],
})
export class CoursesModule {}
