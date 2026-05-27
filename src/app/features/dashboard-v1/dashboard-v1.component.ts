import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssignedCourseService } from '../../core/services/assigned-course.service';
import { AccountStateService } from '../../core/services/account-state.service';
import { AuthService, UserInfo } from '../../core/services/auth.service';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  iconClass: string;
  change: string;
}

@Component({
  selector: 'app-dashboard-v1',
  templateUrl: './dashboard-v1.component.html',
  styleUrls: ['./dashboard-v1.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ImagePathPipe],
})
export class DashboardV1Component implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private assignedCourseService = inject(AssignedCourseService);
  private accountStateService = inject(AccountStateService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  myAssignedCourses: any[] = [];
  isLoadingMyCourses = false;
  accountData: any = null;
  user: UserInfo | null = null;
  currentTime = '';
  greetingText = '';
  greetingIcon = 'bi-sun-fill';
  heroSubtitle = '';

  private clockInterval: any;

  statsCards: StatCard[] = [
    {
      label: 'Enrolled',
      value: 0,
      icon: 'bi-book-fill',
      iconClass: 'stat-card__icon--blue',
      change: '+12%',
    },
    {
      label: 'Completed',
      value: 5,
      icon: 'bi-check-lg',
      iconClass: 'stat-card__icon--green',
      change: '+8%',
    },
    {
      label: 'Hours',
      value: 42,
      icon: 'bi-clock-fill',
      iconClass: 'stat-card__icon--orange',
      change: '+24%',
    },
    {
      label: 'Certificates',
      value: 3,
      icon: 'bi-award-fill',
      iconClass: 'stat-card__icon--purple',
      change: '+2',
    },
  ];

  get displayName(): string {
    return (
      this.user?.name ||
      this.user?.username ||
      this.accountData?.firstName ||
      'Learner'
    );
  }

  get firstName(): string {
    if (this.user?.name) {
      return this.user.name.split(' ')[0];
    }
    return this.accountData?.firstName || this.user?.username || 'Learner';
  }

  get avatarInitials(): string {
    const name = this.displayName;
    return name.charAt(0).toUpperCase();
  }

  get profileImage(): string | null {
    return this.user?.profileImage || null;
  }

  get hasProfileImage(): boolean {
    return !!this.profileImage;
  }

  get userProgram(): string {
    return (
      this.myAssignedCourses?.[0]?.program ||
      this.accountData?.program ||
      'Student'
    );
  }

  get userCollege(): string {
    return (
      this.myAssignedCourses?.[0]?.college ||
      this.accountData?.college ||
      'Learner Portal'
    );
  }

  ngOnInit(): void {
    this.accountData = this.accountStateService.getStoredAccountData();
    this.user = this.authService.currentUser;
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.user = user;
      });
    this.updateClock();
    this.updateGreeting();
    this.clockInterval = setInterval(() => {
      this.updateClock();
      this.updateGreeting();
    }, 60000);
    this.loadMyCourses();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private updateClock(): void {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    this.currentTime = `${hours}:${minutesStr} ${ampm}`;
  }

  private updateGreeting(): void {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.greetingText = 'Good morning';
      this.greetingIcon = 'bi-sunrise-fill';
      this.heroSubtitle = 'Start your day with a new lesson!';
    } else if (hour >= 12 && hour < 17) {
      this.greetingText = 'Good afternoon';
      this.greetingIcon = 'bi-sun-fill';
      this.heroSubtitle = 'Keep the momentum going strong!';
    } else if (hour >= 17 && hour < 21) {
      this.greetingText = 'Good evening';
      this.greetingIcon = 'bi-sunset-fill';
      this.heroSubtitle = 'Wind down with some learning.';
    } else {
      this.greetingText = 'Good night';
      this.greetingIcon = 'bi-moon-stars-fill';
      this.heroSubtitle = 'Burning the midnight oil? You got this!';
    }
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
        this.statsCards[0].value = this.myAssignedCourses.length;
        this.isLoadingMyCourses = false;
      },
      error: () => {
        this.myAssignedCourses = [];
        this.isLoadingMyCourses = false;
      },
    });
  }

  openCourseDetail(courseId: string): void {
    this.router.navigate(['/dashboard/course-detail'], {
      queryParams: { course: courseId },
    });
  }

  courseDetailHandler(courseId: string): void {
    this.router.navigate(['/dashboard/course-detail'], {
      queryParams: { course: courseId },
    });
  }

  continueCourse(): void {
    const next = this.myAssignedCourses[0];
    if (next?.courseId) {
      this.courseDetailHandler(next.courseId);
    } else {
      this.exploreCourses();
    }
  }

  exploreCourses(): void {
    this.router.navigate(['/dashboard/recommended-courses']);
  }
}
