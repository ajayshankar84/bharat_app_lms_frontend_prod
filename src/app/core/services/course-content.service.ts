import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  email?: string;
  bio?: string;
  avatar?: string;
  profileImage?: string;
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
  slug?: string;
  description: string;
  shortDescription?: string;
  instructor: Instructor;
  category: string;
  subcategory?: string;
  level: string;
  language: string;
  type?: 'free' | 'paid';
  price: number;
  discountPrice?: number;
  originalPrice?: number;
  discount?: number;
  duration?: string;
  totalDuration?: string;
  totalLessons?: number;
  totalVideos?: number;
  totalStudents?: number;
  rating?: number;
  totalRatings?: number;
  image?: string;
  thumbnail?: string;
  preview?: Preview | string;
  tags?: string[];
  certificate?: boolean;
  certificateAvailable?: boolean;
  isPublished?: boolean;
  hasLiveClasses?: boolean;
  whatYouLearn?: string[];
  whatYouWillLearn?: string[];
  requirements?: string[];
  videos?: Lesson[];
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

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.session.getSessionToken()}`,
    });
  }

  getAllCourses(): Observable<any> {
    return this.http.get(`${COURSE_CONTENT_BASE}/courses`, {
      headers: this.headers,
    });
  }

  getCourseById(id: string): Observable<any> {
    return this.http.get(`${COURSE_CONTENT_BASE}/courses/${id}`, {
      headers: this.headers,
    });
  }

  getCourseLessons(courseId: string): Observable<any> {
    return this.http.get(`${COURSE_CONTENT_BASE}/courses/${courseId}/lessons`, {
      headers: this.headers,
    });
  }

  getLessonById(courseId: string, lessonId: string): Observable<any> {
    return this.http.get(
      `${COURSE_CONTENT_BASE}/courses/${courseId}/lessons/${lessonId}`,
      { headers: this.headers },
    );
  }

  createCourseContent(payload: any): Observable<any> {
    return this.http.post(`${COURSE_CONTENT_BASE}/courses`, payload, {
      headers: this.headers,
    });
  }

  updateCourseContent(id: string, payload: any): Observable<any> {
    return this.http.put(`${COURSE_CONTENT_BASE}/courses/${id}`, payload, {
      headers: this.headers,
    });
  }

  deleteCourseContent(id: string): Observable<any> {
    return this.http.delete(`${COURSE_CONTENT_BASE}/courses/${id}`, {
      headers: this.headers,
    });
  }

  uploadMedia(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('files', file, file.name);
    formData.append('fileSize', file.size.toString());
    formData.append('fileType', file.type);
    formData.append('fileName', file.name);

    return this.http.post(`${UPLOAD_URL}/api/upload`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.session.getSessionToken()}`,
      }),
    });
  }
}
