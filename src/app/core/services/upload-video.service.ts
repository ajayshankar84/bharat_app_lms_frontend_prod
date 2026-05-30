import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UPLOAD_VIDEO_ENDPOINT, VIDEO_PROGRESS_ENDPOINT } from '../config/api.config';

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
   * Fetches existing video records for a specific course and topic.
   * @param courseId The ID of the course to query.
   * @param topicId The ID of the topic to query.
   */
  getVideosByCourseIdTopicId(courseId: string, topicId: string): Observable<any> {
    const endpoint = `${UPLOAD_VIDEO_ENDPOINT}/${courseId}/${topicId}`;
    return this.http.get(endpoint);
  }

  /**
   * Fetches existing video records for a specific course, topic, and lecture.
   * @param courseId The ID of the course to query.
   * @param topicId The ID of the topic to query.
   * @param lectureId The ID of the lecture to query.
   */
  getVideosByCourseIdTopicIdLectureId(courseId: string, topicId: string, lectureId: string): Observable<any> {
    const endpoint = `${UPLOAD_VIDEO_ENDPOINT}/${courseId}/${topicId}/${lectureId}`;
    return this.http.get(endpoint);
  }

  /**
   * Saves the current playback time for a specific video and user.
   */
  saveVideoProgress(payload: any): Observable<any> {
    return this.http.post(VIDEO_PROGRESS_ENDPOINT, payload);
  }

  /**
   * Retrieves the last saved playback time for a specific video and user.
   */
  getVideoProgress(userId: string, videoPath: string): Observable<any> {
    return this.http.get(`${VIDEO_PROGRESS_ENDPOINT}`, {
      params: { userId, videoPath }
    });
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

  /**
   * Deletes a video record by its unique identifier.
   * @param id The unique identifier of the video record (_id).
   */
  deleteVideo(id: string): Observable<any> {
    const endpoint = `${UPLOAD_VIDEO_ENDPOINT}/${id}`;
    return this.http.delete(endpoint);
  }
}