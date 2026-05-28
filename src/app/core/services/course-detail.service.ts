import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { COURSE_DETAIL_ENDPOINT } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class CourseDetailService {
  constructor(private http: HttpClient) {}

  getCourseDetailById(courseId: string): Observable<any> {
     const courseDetailEndpoint = `${COURSE_DETAIL_ENDPOINT}/${courseId}`;
    return this.http.get(courseDetailEndpoint).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Retrieves specific topic details (including its lectures) for a given course and topic ID.
   * This implementation filters the full course detail locally after fetching it.
   */
  getCourseDetailByCourseIdByTopicID(courseId: string, topicId: string): Observable<any> {
    return this.getCourseDetailById(courseId).pipe(
      map((response: any) => {
        // Handle the response which is typically an array of details
        const detail = Array.isArray(response) ? response[0] : response;
        const curriculum = detail?.curriculum || [];
        // Find the specific topic object by its topicId (UUID)
        const topic = curriculum.find((item: any) => item.topicId === topicId);
        return topic || null; // Return the found topic (which should contain lectures) or null
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  updateCourseDetail(courseId: string, detail: any): Observable<any> {
    const updateEndpoint = `${COURSE_DETAIL_ENDPOINT}/${courseId}`;
    return this.http.put(updateEndpoint, detail).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }
}
