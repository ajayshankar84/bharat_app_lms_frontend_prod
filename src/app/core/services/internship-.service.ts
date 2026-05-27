import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { COURSES_ENDPOINT, LMS_INTERNSHIP_ENDPOINT } from '../config/api.config'; 

@Injectable({
  providedIn: 'root',
})
export class InternshipService {
  constructor(private http: HttpClient) {}
    
  getAllInternships(): Observable<any[]> {
    return this.http.get<any[]>(LMS_INTERNSHIP_ENDPOINT);
  }

  getAllCourses(): Observable<any[]> {
    return this.http.get<any[]>(COURSES_ENDPOINT);
  }
}
