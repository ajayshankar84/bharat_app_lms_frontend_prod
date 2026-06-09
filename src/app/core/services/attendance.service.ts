import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ATTENDANCE_ENDPOINT } from '../config/api.config';

export type AttendancePayload = {
  studentId: string;
  studentName: string;
  email: string;
  mobile: string;
  program: string;
  internshipType: string;
  college: string;
  courseId: string;
  courseName: string;
  batchId: string;
  batchName: string;
  markedAt: string;
  isPresent: boolean

};

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  constructor(private http: HttpClient) { }

  saveAttendance(payload: AttendancePayload | AttendancePayload[]): Observable<any> {
    const courseDetailEndpoint = `${ATTENDANCE_ENDPOINT}/create`;
    return this.http.post(courseDetailEndpoint, payload).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  getAllAttendancesByMobile(mobile: string): Observable<any> {
    const courseDetailEndpoint = `${ATTENDANCE_ENDPOINT}/mobile/${mobile}`;
    return this.http.get(courseDetailEndpoint).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  
  getAllAttendancesByDate(date: string): Observable<any> {
    console.log('date',date);
    const courseDetailEndpoint = `${ATTENDANCE_ENDPOINT}/date/${date}`;
    return this.http.get(courseDetailEndpoint).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }
}
