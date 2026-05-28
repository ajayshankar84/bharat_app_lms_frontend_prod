import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignedCourseService } from '../../core/services/assigned-course.service';
import { AccountStateService } from '../../core/services/account-state.service';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard-v1',
  templateUrl: './dashboard-v1.component.html',
  styleUrls: ['./dashboard-v1.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ImagePathPipe]
})
export class DashboardV1Component {
  myAssignedCourses: any[] = [];
  isLoadingMyCourses = false;
  accountData: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private assignedCourseService: AssignedCourseService,
    private accountStateService: AccountStateService
  ) { }

  ngOnInit(): void {
    this.accountData = this.accountStateService.getStoredAccountData();
    this.loadMyCourses();
  }

  private loadMyCourses(): void {
    const mobile = this.accountStateService.getStoredAccountData()?.mobile;
    if (!mobile) {
      this.myAssignedCourses = [];
      return;
    }

    this.isLoadingMyCourses = true;
    this.assignedCourseService.getAllAssignedCoursesByMobile(mobile).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        this.myAssignedCourses = Array.isArray(data) ? data : [];
        console.log('Assigned courses for mobile', mobile, ':', this.myAssignedCourses);
        this.isLoadingMyCourses = false;
      },
      error: () => {
        this.myAssignedCourses = [];
        this.isLoadingMyCourses = false;
      },
    });
  }

  openCourseDetail(courseId: string): void {
    this.router.navigate(['/features/course-detail'], {
      queryParams: { course: courseId },
    });
  }

  courseDetailHandler(courseId: string): void {
    this.router.navigate(['/features/course-detail'], {
      queryParams: { course: courseId },
    });
  }
}
