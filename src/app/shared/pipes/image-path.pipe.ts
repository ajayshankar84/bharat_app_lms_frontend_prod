import { Pipe, PipeTransform, inject } from '@angular/core';
import { UPLOAD_URL } from '../../core/config/api.config';
import { SessionService } from '../../core/services/session.service';

@Pipe({
  name: 'imagePath',
  standalone: true,
})
export class ImagePathPipe implements PipeTransform {
  private session = inject(SessionService);

  transform(fileId: string | null | undefined): string {
    if (!fileId) {
      return 'assets/images/placeholder.png';
    }
    const token = this.session.getSessionToken() || '';
    return `${UPLOAD_URL}/api/file/${fileId}?token=${token}`;
  }
}
