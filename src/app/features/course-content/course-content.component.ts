import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CourseContentService,
  CourseContent,
  Lesson,
} from '../../core/services/course-content.service';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';

type ViewMode = 'overview' | 'lessons' | 'lesson-detail';

@Component({
  selector: 'app-course-content',
  templateUrl: './course-content.component.html',
  styleUrls: ['./course-content.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ImagePathPipe],
})
export class CourseContentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseContentService = inject(CourseContentService);

  courseId: string | null = null;
  course: CourseContent | null = null;
  lessons: Lesson[] = [];
  selectedLesson: Lesson | null = null;

  viewMode: ViewMode = 'overview';
  isLoading = false;
  isLoadingLessons = false;
  isLoadingLesson = false;
  errorMessage = '';

  activeTab: 'about' | 'curriculum' | 'instructor' | 'reviews' = 'about';

  ngOnInit(): void {
    this.courseId = this.route.snapshot.queryParamMap.get('course');
    if (this.courseId) {
      this.loadCourse(this.courseId);
    } else {
      this.errorMessage = 'No course ID provided';
    }
  }
  loadCourse(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.courseContentService.getCourseById(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.course = data;
        if (data?.lessons && Array.isArray(data.lessons)) {
          this.lessons = data.lessons;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching course:', err);
        this.errorMessage =
          err?.error?.message || 'Failed to load course details.';
        this.isLoading = false;
      },
    });
  }

  loadLessons(): void {
    if (!this.courseId) return;
    if (this.lessons.length > 0) {
      this.viewMode = 'lessons';
      return;
    }

    this.isLoadingLessons = true;
    this.courseContentService.getCourseLessons(this.courseId).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.lessons = Array.isArray(data) ? data : data?.lessons || [];
        this.viewMode = 'lessons';
        this.isLoadingLessons = false;
      },
      error: (err) => {
        console.error('Error fetching lessons:', err);
        this.errorMessage = err?.error?.message || 'Failed to load lessons.';
        this.isLoadingLessons = false;
      },
    });
  }
  getPreviewUrl(): string {
    if (!this.course?.preview) return '';
    if (typeof this.course.preview === 'string') return this.course.preview;
    return this.course.preview.videoUrl || '';
  }

  getPreviewDuration(): string {
    if (!this.course?.preview) return '';
    if (typeof this.course.preview === 'string') return '';
    return this.course.preview.duration || '';
  }

  isActiveLesson(lesson: Lesson, index: number): boolean {
    if (!this.selectedLesson) return false;
    if (this.selectedLesson._id && lesson._id) {
      return this.selectedLesson._id === lesson._id;
    }
    return (this.selectedLesson.order || 0) === index + 1;
  }
  viewLesson(lesson: Lesson, index: number): void {
    if (!this.courseId || !lesson._id) {
      this.selectedLesson = { ...lesson, order: index + 1 };
      this.viewMode = 'lesson-detail';
      return;
    }

    this.isLoadingLesson = true;
    this.courseContentService
      .getLessonById(this.courseId, lesson._id)
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res;
          this.selectedLesson = { ...data, order: index + 1 };
          this.viewMode = 'lesson-detail';
          this.isLoadingLesson = false;
        },
        error: () => {
          this.selectedLesson = { ...lesson, order: index + 1 };
          this.viewMode = 'lesson-detail';
          this.isLoadingLesson = false;
        },
      });
  }

  goToOverview(): void {
    this.viewMode = 'overview';
    this.selectedLesson = null;
  }

  goToLessons(): void {
    if (this.lessons.length === 0) {
      this.loadLessons();
    } else {
      this.viewMode = 'lessons';
    }
    this.selectedLesson = null;
  }

  setTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  navigateBack(): void {
    this.router.navigate(['/dashboard/courses']);
  }

  navigateToEdit(): void {
    if (!this.courseId) return;
    this.router.navigate(['/dashboard/create-course'], {
      queryParams: { course: this.courseId },
    });
  }

  nextLesson(): void {
    if (!this.selectedLesson) return;
    const currentIdx = (this.selectedLesson.order || 1) - 1;
    if (currentIdx < this.lessons.length - 1) {
      this.viewLesson(this.lessons[currentIdx + 1], currentIdx + 1);
    }
  }

  prevLesson(): void {
    if (!this.selectedLesson) return;
    const currentIdx = (this.selectedLesson.order || 1) - 1;
    if (currentIdx > 0) {
      this.viewLesson(this.lessons[currentIdx - 1], currentIdx - 1);
    }
  }

  isExternalUrl(url: string | undefined): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  isFreeCourse(): boolean {
    return this.course?.type === 'free' || !this.course?.price;
  }

  getDiscountPercent(): number {
    if (!this.course?.originalPrice || !this.course?.price) return 0;
    if (this.course.price >= this.course.originalPrice) return 0;
    return Math.round(
      ((this.course.originalPrice - this.course.price) /
        this.course.originalPrice) *
        100,
    );
  }

  hasPrevLesson(): boolean {
    return !!this.selectedLesson && (this.selectedLesson.order || 1) > 1;
  }

  hasNextLesson(): boolean {
    return (
      !!this.selectedLesson &&
      (this.selectedLesson.order || 1) < this.lessons.length
    );
  }
}
