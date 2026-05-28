import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadVideoRoutingModule } from './upload-video-routing.module';
import { UploadVideoComponent } from './upload-video.component';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    UploadVideoComponent
  ],
  imports: [
    CommonModule,
    UploadVideoRoutingModule,
      ReactiveFormsModule,
    ImagePathPipe
  ]
})
export class UploadVideoModule { }