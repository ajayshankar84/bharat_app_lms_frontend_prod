import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Course, CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss'],
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  searchTerm = '';
  filterCategory = '';
  filterStatus: 'all' | 'active' | 'inactive' = 'all';

  constructor(
    private router: Router,
    private courseService: CourseService,
  ) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  get uniqueCategories(): string[] {
    const cats = new Set<string>();
    this.courses.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }

  get filteredCourses(): Course[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.courses.filter((course) => {
      const matchesSearch =
        !term ||
        course.name?.toLowerCase().includes(term) ||
        course.category?.toLowerCase().includes(term) ||
        course.tag?.toLowerCase().includes(term) ||
        course.description?.toLowerCase().includes(term);

      const matchesCategory =
        !this.filterCategory || course.category === this.filterCategory;

      const matchesStatus =
        this.filterStatus === 'all' ||
        (this.filterStatus === 'active' && course.active) ||
        (this.filterStatus === 'inactive' && !course.active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  loadCourses(): void {
    this.courseService.getCourses().subscribe({
      next: (data: Course[]) => {
        this.courses = data;
      },
      error: (err: any) => {
        console.error('Error loading courses:', err);
      },
    });
  }

  navigateToAdd(): void {
    this.router.navigate(['/dashboard/create-course']);
  }

  navigateToDetail(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/dashboard/course-content'], {
        queryParams: { course: id },
      });
    }
  }

  navigateToCourse(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/dashboard/create-course'], {
        queryParams: { course: id },
      });
    }
  }
}
