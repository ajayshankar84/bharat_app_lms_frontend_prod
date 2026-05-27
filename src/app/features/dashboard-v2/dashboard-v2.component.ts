import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountStateService } from '../../core/services/account-state.service';
import { AuthService, UserInfo } from '../../core/services/auth.service';

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  iconClass: string;
  change: string;
}

interface ContinueCourse {
  id: string;
  title: string;
  icon: string;
  variant: string;
  badge: string;
  currentModule: number;
  totalModules: number;
  progress: number;
  actionLabel: string;
}

interface RecommendedCourse {
  id: string;
  title: string;
  icon: string;
  variant: string;
  badge: string;
  rating: number;
  fullStars: number;
  instructor: string;
  modules: number;
  hours: number;
  actionLabel: string;
}

@Component({
  selector: 'app-dashboard-v2',
  templateUrl: './dashboard-v2.component.html',
  styleUrls: ['./dashboard-v2.component.scss'],
})
export class DashboardV2Component implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private accountStateService = inject(AccountStateService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  accountData: any = null;
  user: UserInfo | null = null;
  currentTime = '';
  greetingText = '';
  greetingIcon = 'bi-sun-fill';
  heroSubtitle = '';

  private clockInterval: any;

  readonly statsCards: StatCard[] = [
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

  readonly continueCourses: ContinueCourse[] = [
    {
      id: 'advanced-ui-ux-design',
      title: 'Advanced UI/UX Design',
      icon: 'bi-palette',
      variant: 'course-card__banner--gradient-1',
      badge: 'In Progress',
      currentModule: 4,
      totalModules: 10,
      progress: 68,
      actionLabel: 'Resume',
    },
    {
      id: 'frontend-mastery',
      title: 'Frontend Mastery',
      icon: 'bi-code-slash',
      variant: 'course-card__banner--gradient-2',
      badge: 'New',
      currentModule: 2,
      totalModules: 12,
      progress: 22,
      actionLabel: 'Continue',
    },
    {
      id: 'design-systems',
      title: 'Design Systems',
      icon: 'bi-bullseye',
      variant: 'course-card__banner--gradient-3',
      badge: 'Almost done',
      currentModule: 9,
      totalModules: 10,
      progress: 92,
      actionLabel: 'Finish',
    },
  ];

  readonly recommendedCourses: RecommendedCourse[] = [
    {
      id: 'mobile-app-design',
      title: 'Mobile App Design',
      icon: 'bi-phone',
      variant: 'course-card__banner--gradient-4',
      badge: 'Popular',
      rating: 4.9,
      fullStars: 5,
      instructor: 'Sarah Chen',
      modules: 12,
      hours: 8,
      actionLabel: 'Enroll Now',
    },
    {
      id: 'ai-for-designers',
      title: 'AI for Designers',
      icon: 'bi-cpu',
      variant: 'course-card__banner--gradient-5',
      badge: 'Trending',
      rating: 4.7,
      fullStars: 4,
      instructor: 'Marcus Rivera',
      modules: 8,
      hours: 6,
      actionLabel: 'Explore',
    },
    {
      id: 'web-performance',
      title: 'Web Performance',
      icon: 'bi-lightning',
      variant: 'course-card__banner--gradient-6',
      badge: 'New',
      rating: 5.0,
      fullStars: 5,
      instructor: 'Emily Watson',
      modules: 6,
      hours: 4.5,
      actionLabel: 'Start Free',
    },
  ];

  readonly myCourses: RecommendedCourse[] = [...this.recommendedCourses];

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

  get userRole(): string {
    return this.accountData?.designation || this.accountData?.role || 'Student';
  }

  get userLocation(): string {
    const city = this.accountData?.city;
    const state = this.accountData?.state;
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    return 'India';
  }

  get userPhone(): string {
    return this.user?.phone || this.accountData?.mobile || '';
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

  openCourseDetail(courseId: string): void {
    this.router.navigate(['course-detail'], {
      relativeTo: this.route,
      queryParams: { course: courseId },
    });
  }

  continueCourse(): void {
    const next = this.continueCourses[0];
    if (next) {
      this.openCourseDetail(next.id);
    }
  }

  exploreCourses(): void {
    this.router.navigate(['/dashboard/recommended-courses']);
  }
}
