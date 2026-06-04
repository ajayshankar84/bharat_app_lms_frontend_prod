import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UPLOAD_FILE_ENDPOINT, FILE_PROGRESS_ENDPOINT } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class UploadFileService {
  constructor(private http: HttpClient) {}

  /**
   * Fetches existing video records for a specific course.
   * @param courseId The ID of the course to query.
   */
  getFilesByCourseId(courseId: string): Observable<any> {
    const endpoint = `${UPLOAD_FILE_ENDPOINT}/${courseId}`;
    return this.http.get(endpoint);
  }

  /**
   * Fetches existing video records for a specific course and topic.
   * @param courseId The ID of the course to query.
   * @param topicId The ID of the topic to query.
   */
  getFilesByCourseIdTopicId(courseId: string, topicId: string): Observable<any> {
    const endpoint = `${UPLOAD_FILE_ENDPOINT}/${courseId}/${topicId}`;
    return this.http.get(endpoint);
  }

  /**
   * Fetches existing video records for a specific course, topic, and lecture.
   * @param courseId The ID of the course to query.
   * @param topicId The ID of the topic to query.
   * @param lectureId The ID of the lecture to query.
   */
  getFilesByCourseIdTopicIdLectureId(courseId: string, topicId: string, lectureId: string): Observable<any> {
    const endpoint = `${UPLOAD_FILE_ENDPOINT}/${courseId}/${topicId}/${lectureId}`;
    return this.http.get(endpoint);
  }

  /**
   * Saves the current playback time for a specific video and user.
   */
  getFilesProgress(payload: any): Observable<any> {
    return this.http.post(FILE_PROGRESS_ENDPOINT, payload);
  }

  /**
   * Retrieves the last saved playback time for a specific video and user.
   */
  getFileProgress(userId: string, filePath: string): Observable<any> {
    return this.http.get(`${FILE_PROGRESS_ENDPOINT}`, {
      params: { userId, filePath }
    });
  }

  /**
   * Uploads a video along with metadata using multipart/form-data.
   * @param payload Object containing video File and metadata fields from the form.
   */

  /**
   * Uploads a generic file (PDF, Doc, Image) using multipart/form-data.
   * @param payload Object containing File and metadata.
   */
  uploadFile(payload: any): Observable<HttpEvent<any>> {
    const formData = new FormData();
    
    if (payload.file) {
      formData.append('file', payload.file, payload.file.name);
    }

    Object.keys(payload).forEach(key => {
      if (key !== 'file' && payload[key] !== null && payload[key] !== undefined) {
        formData.append(key, payload[key]);
      }
    });

    return this.http.post(UPLOAD_FILE_ENDPOINT, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  /**
   * Deletes a video record by its unique identifier.
   * @param id The unique identifier of the video record (_id).
   */
  deleteFile(id: string): Observable<any> {
    const endpoint = `${UPLOAD_FILE_ENDPOINT}/${id}`;
    return this.http.delete(endpoint);
  }
}