import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
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

  updateCourseDetail(courseId: string, detail: any): Observable<any> {
    const updateEndpoint = `${COURSE_DETAIL_ENDPOINT}/${courseId}`;
    return this.http.put(updateEndpoint, detail).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }
}
