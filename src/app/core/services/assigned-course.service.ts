import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ASSIGNED_COURSES_ENDPOINT } from '../config/api.config'; 

export type AssignedCoursePayload = {
  courseId: string;
  courseName: string;
    type: string;
  category: string;
  description: string;
  tag: string;
  price: number;
  discountType: string;
  discount: number;
  finalPrice: number;
  rating: number;
  imagePath: string;
  active: boolean;
  createdAt: Date;
  isPaid: boolean;  
  batchId: string;
  batchName: string;
  studentName: string;
  email: string;
  mobile: string;
  program: string;
  internshipType: string;
  college: string;
};

@Injectable({
  providedIn: 'root',
})
export class AssignedCourseService {
  constructor(private http: HttpClient) {}   

  assignedCourses(payload: AssignedCoursePayload | AssignedCoursePayload[]): Observable<any> {
    const courseDetailEndpoint = `${ASSIGNED_COURSES_ENDPOINT}/create`;
    return this.http.post(courseDetailEndpoint, payload).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  getAllAssignedCoursesByMobile(mobile: string): Observable<any> {
    const courseDetailEndpoint = `${ASSIGNED_COURSES_ENDPOINT}/mobile/${mobile}`;
    return this.http.get(courseDetailEndpoint).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

   getAllAssignedCourses(): Observable<any> {
    const courseDetailEndpoint = `${ASSIGNED_COURSES_ENDPOINT}}`;
    return this.http.get(courseDetailEndpoint).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }
}
