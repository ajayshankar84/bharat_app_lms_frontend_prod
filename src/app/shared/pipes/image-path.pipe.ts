import { Pipe, PipeTransform } from '@angular/core';
import { IMAGE_BASE_URL } from '../../core/services/course.service';

@Pipe({
  name: 'imagePath',
  standalone: true
})
export class ImagePathPipe implements PipeTransform {
  transform(value: string | undefined, defaultImage: string = IMAGE_BASE_URL+'upload/bg.png'): string {
    if (!value) {
      return defaultImage;
    }
    // If it's already a full URL or a data URL (base64), return it as is
    if (value.startsWith('http') || value.startsWith('data:')) {
      return value;
    }
    return `${IMAGE_BASE_URL}${value}`;
  }
}