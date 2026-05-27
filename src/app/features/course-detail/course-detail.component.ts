import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CourseDetailService } from '../../core/services/course-detail.service';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';
import { SplitPipe } from '../../shared/pipes/split.pipe';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, ImagePathPipe, SplitPipe],
})
export class CourseDetailComponent implements OnInit {
  courseId: string | null;
  courseDetail: any = null;
  isLoading: boolean = false;
  error: string | null = null;
  expandAll: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private courseDetailService: CourseDetailService,
  ) {
    this.courseId = this.route.snapshot.queryParamMap.get('course');
  }

  ngOnInit(): void {
    if (this.courseId) {
      this.fetchCourseDetail();
    } else {
      this.error = 'No course ID provided';
    }
  }

  get totalLectures(): number {
    if (!this.courseDetail?.[0]?.curriculum?.length) return 0;
    return this.courseDetail[0].curriculum.reduce(
      (sum: number, sec: any) => sum + (sec?.lectures?.length || 0),
      0,
    );
  }

  fetchCourseDetail(): void {
    if (!this.courseId) return;

    this.isLoading = true;
    this.error = null;

    this.courseDetailService.getCourseDetailById(this.courseId).subscribe({
      next: (response) => {
        this.courseDetail = response;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching course detail:', error);
        this.error = error?.error?.message || 'Failed to load course details';
        this.isLoading = false;
      },
    });
  }

  toggleExpandAll(): void {
    this.expandAll = !this.expandAll;
  }
}
