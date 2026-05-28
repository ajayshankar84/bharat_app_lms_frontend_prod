import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UPLOAD_VIDEO_ENDPOINT } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class UploadVideoService {
  constructor(private http: HttpClient) {}

  /**
   * Fetches existing video records for a specific course.
   * @param courseId The ID of the course to query.
   */
  getVideosByCourseId(courseId: string): Observable<any> {
    const endpoint = `${UPLOAD_VIDEO_ENDPOINT}/${courseId}`;
    return this.http.get(endpoint);
  }

  /**
   * Uploads a video along with metadata using multipart/form-data.
   * @param payload Object containing video File and metadata fields from the form.
   */
  uploadVideo(payload: any): Observable<HttpEvent<any>> {
    const formData = new FormData();
    
    // Append the binary video file
    if (payload.video) {
      formData.append('video', payload.video);
    }

    // Dynamically append all other metadata fields
    Object.keys(payload).forEach(key => {
      if (key !== 'video' && payload[key] !== null && payload[key] !== undefined) {
        formData.append(key, payload[key]);
      }
    });

    return this.http.post(UPLOAD_VIDEO_ENDPOINT, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }
}