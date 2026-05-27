import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  CourseContentService,
  CourseContent,
  Pagination,
} from '../../core/services/course-content.service';

interface FilterChip {
  label: string;
  value: string;
  count?: number;
}

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss'],
})
export class CoursesComponent implements OnInit {
  private router = inject(Router);
  private courseContentService = inject(CourseContentService);

  allCourses: CourseContent[] = [];
  filteredCourses: CourseContent[] = [];
  pagination: Pagination | null = null;

  isLoading = false;
  errorMessage = '';
  searchQuery = '';
  activeCategory = 'all';
  activeLevel = 'all';
  activeType: 'all' | 'free' | 'paid' = 'all';
  sortBy: 'newest' | 'price-low' | 'price-high' | 'title' | 'rating' = 'newest';

  categoryChips: FilterChip[] = [];
  readonly levelChips: FilterChip[] = [
    { label: 'All', value: 'all' },
    { label: 'Beginner', value: 'Beginner' },
    { label: 'Intermediate', value: 'Intermediate' },
    { label: 'Advanced', value: 'Advanced' },
  ];

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.courseContentService.getAllCourses().subscribe({
      next: (res) => {
        if (res?.success && res?.data?.courses) {
          this.allCourses = res.data.courses;
          this.pagination = res.data.pagination;
        } else {
          this.allCourses = [];
        }
        this.buildCategoryChips();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.errorMessage =
          err?.error?.message || 'Failed to load courses. Please try again.';
        this.allCourses = [];
        this.filteredCourses = [];
        this.isLoading = false;
      },
    });
  }

  private buildCategoryChips(): void {
    const map = new Map<string, number>();
    this.allCourses.forEach((c) => {
      if (c.category) {
        map.set(c.category, (map.get(c.category) || 0) + 1);
      }
    });

    this.categoryChips = [
      { label: 'All', value: 'all', count: this.allCourses.length },
      ...Array.from(map.entries()).map(([label, count]) => ({
        label,
        value: label,
        count,
      })),
    ];
  }

  applyFilters(): void {
    let result = [...this.allCourses];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.subcategory?.toLowerCase().includes(q) ||
          c.instructor?.name?.toLowerCase().includes(q),
      );
    }

    if (this.activeCategory !== 'all') {
      result = result.filter((c) => c.category === this.activeCategory);
    }

    if (this.activeLevel !== 'all') {
      result = result.filter((c) => c.level === this.activeLevel);
    }

    if (this.activeType !== 'all') {
      result = result.filter((c) => c.type === this.activeType);
    }

    switch (this.sortBy) {
      case 'price-low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'title':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => {
          const da = new Date(a.createdAt || 0).getTime();
          const db = new Date(b.createdAt || 0).getTime();
          return db - da;
        });
        break;
    }

    this.filteredCourses = result;
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.applyFilters();
  }

  setCategory(value: string): void {
    this.activeCategory = value;
    this.applyFilters();
  }

  setLevel(value: string): void {
    this.activeLevel = value;
    this.applyFilters();
  }

  setType(value: 'all' | 'free' | 'paid'): void {
    this.activeType = value;
    this.applyFilters();
  }

  onSortChange(sort: typeof this.sortBy): void {
    this.sortBy = sort;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.activeCategory = 'all';
    this.activeLevel = 'all';
    this.activeType = 'all';
    this.sortBy = 'newest';
    this.applyFilters();
  }

  isFree(course: CourseContent): boolean {
    return course.type === 'free' || !course.price || course.price === 0;
  }

  getInstructorInitial(course: CourseContent): string {
    return course.instructor?.name?.charAt(0).toUpperCase() || '?';
  }

  isExternalUrl(url: string | undefined): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  navigateToAdd(): void {
    this.router.navigate(['/dashboard/create-course']);
  }

  navigateToEdit(id?: string): void {
    if (!id) return;
    this.router.navigate(['/dashboard/create-course'], {
      queryParams: { course: id },
    });
  }

  navigateToDetail(id?: string): void {
    if (!id) return;
    this.router.navigate(['/dashboard/course-content'], {
      queryParams: { course: id },
    });
  }
}
