import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Course, CourseService } from '../../core/services/course.service'; // Import Course and CourseService

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  courses: Course[] = []; // Initialize as an empty array of Course type

  constructor(
    private router: Router,
    private courseService: CourseService // Inject CourseService
  ) { }

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.courseService.getCourses().subscribe({
      next: (data: Course[]) => {
        this.courses = data;
        console.log('Courses loaded:', this.courses);
      },
      error: (err: any) => {
        console.error('Error loading courses:', err);
        // Handle error, e.g., display a message to the user
      }
    });
  }

  navigateToAdd(): void {
    this.router.navigate(['/features/create-course']);
  }

  navigateToDetail(id: string | undefined): void { // id can be undefined if _id is not present
    if (id) {
      // this.router.navigate(['/features/course-content', id]); // Pass ID to course-detail
      this.router.navigate(['/features/course-content'], {
        queryParams: { course: id },
      });
    } else {
      console.warn('Attempted to navigate to course detail without an ID.');
    }
  }
  navigateToCourse(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/features/create-course'], {
        queryParams: { course: id },
      });
    } else {
      console.warn('Attempted to navigate to course content without an ID.');
    }
  }

  navigateToUploadVideo(){
     this.router.navigate(['/features/upload-video']);
  }
}