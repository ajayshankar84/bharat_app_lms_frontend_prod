import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionService } from './session.service';
import { UPLOAD_URL, COURSE_CONTENT_BASE } from '../config/api.config';

export interface Preview {
  videoUrl: string;
  duration: string;
}

export interface Instructor {
  _id: string;
  name: string;
  bio?: string;
  avatar?: string;
  specializations?: string[];
  coursesCount?: number;
  studentsCount?: number;
  averageRating?: number;
}

export interface Lesson {
  _id?: string;
  name: string;
  description?: string;
  videoUrl?: string;
  thumbnail?: string;
  duration?: string;
  order?: number;
}

export interface CourseContent {
  _id?: string;
  title: string;
  description: string;
  instructor: Instructor;
  category: string;
  subcategory?: string;
  level: string;
  language: string;
  type: 'free' | 'paid';
  price: number;
  originalPrice: number;
  discount: number;
  duration: string;
  totalLessons: number;
  totalStudents?: number;
  rating?: number;
  totalRatings?: number;
  image: string;
  preview?: Preview;
  tags?: string[];
  certificate?: boolean;
  hasLiveClasses?: boolean;
  whatYouLearn?: string[];
  requirements?: string[];
  lessons?: Lesson[];
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCourses: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class CourseContentService {
  private http = inject(HttpClient);
  private session = inject(SessionService);

  getAllCourses(): Observable<any> {
    return this.http.get(`${COURSE_CONTENT_BASE}/courses`);
  }

  getCourseById(id: string): Observable<any> {
    return this.http.get(`${COURSE_CONTENT_BASE}/courses/${id}`);
  }

  getCourseLessons(courseId: string): Observable<any> {
    return this.http.get(`${COURSE_CONTENT_BASE}/courses/${courseId}/lessons`);
  }

  getLessonById(courseId: string, lessonId: string): Observable<any> {
    return this.http.get(
      `${COURSE_CONTENT_BASE}/courses/${courseId}/lessons/${lessonId}`
    );
  }

  createCourseContent(payload: any): Observable<any> {
    return this.http.post(`${COURSE_CONTENT_BASE}/courses`, payload);
  }

  updateCourseContent(id: string, payload: any): Observable<any> {
    return this.http.put(`${COURSE_CONTENT_BASE}/courses/${id}`, payload);
  }

  deleteCourseContent(id: string): Observable<any> {
    return this.http.delete(`${COURSE_CONTENT_BASE}/courses/${id}`);
  }

  uploadMedia(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${UPLOAD_URL}/api/upload`, formData);
  }
}
