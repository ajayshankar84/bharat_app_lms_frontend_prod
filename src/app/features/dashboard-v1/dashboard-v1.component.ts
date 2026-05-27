import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AssignedCourseService } from '../../core/services/assigned-course.service';
import { AuthService, UserInfo } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  gradient: string;
}

interface Greeting {
  text: string;
  icon: string;
  emoji: string;
}

@Component({
  selector: 'app-dashboard-v1',
  templateUrl: './dashboard-v1.component.html',
  styleUrls: ['./dashboard-v1.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ImagePathPipe],
})
export class DashboardV1Component implements OnInit {
  private router = inject(Router);
  private assignedCourseService = inject(AssignedCourseService);
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);

  myAssignedCourses: any[] = [];
  isLoadingMyCourses = false;
  user: UserInfo | null = null;
  currentTime = '';

  stats: StatCard[] = [
    {
      label: 'Enrolled',
      value: 0,
      icon: 'bi-book',
      trend: '+12%',
      trendUp: true,
      gradient: 'linear-gradient(135deg, #4a90e2, #357abd)',
    },
    {
      label: 'Completed',
      value: 5,
      icon: 'bi-check2-circle',
      trend: '+8%',
      trendUp: true,
      gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    },
    {
      label: 'Hours',
      value: 42,
      icon: 'bi-clock-history',
      trend: '+24%',
      trendUp: true,
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    },
    {
      label: 'Certificates',
      value: 3,
      icon: 'bi-award',
      trend: '+2',
      trendUp: true,
      gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    },
  ];

  get userInitials(): string {
    const name = this.user?.name || this.user?.username || 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  get displayName(): string {
    return this.user?.name || this.user?.username || 'Learner';
  }

  get greeting(): Greeting {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return { text: 'Good morning', icon: 'bi-sunrise-fill', emoji: '☀️' };
    }
    if (hour >= 12 && hour < 17) {
      return { text: 'Good afternoon', icon: 'bi-sun-fill', emoji: '🌤️' };
    }
    if (hour >= 17 && hour < 21) {
      return { text: 'Good evening', icon: 'bi-sunset-fill', emoji: '🌅' };
    }
    return { text: 'Good night', icon: 'bi-moon-stars-fill', emoji: '🌙' };
  }

  get motivationalSubtitle(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return 'A great day to learn something new!';
    }
    if (hour >= 12 && hour < 17) {
      return 'Keep the momentum going strong!';
    }
    if (hour >= 17 && hour < 21) {
      return 'Wrap up your day with some learning!';
    }
    return 'Burning the midnight oil? You got this!';
  }

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.updateTime();
    setInterval(() => this.updateTime(), 60000);
    this.loadMyCourses();
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private loadMyCourses(): void {
    const mobile = this.user?.phone;
    if (!mobile) {
      this.myAssignedCourses = [];
      return;
    }

    this.isLoadingMyCourses = true;
    this.assignedCourseService.getAllAssignedCoursesByMobile(mobile).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        this.myAssignedCourses = Array.isArray(data) ? data : [];
        this.stats[0].value = this.myAssignedCourses.length;
        this.isLoadingMyCourses = false;
      },
      error: () => {
        this.myAssignedCourses = [];
        this.isLoadingMyCourses = false;
      },
    });
  }

  courseDetailHandler(courseId: string): void {
    this.router.navigate(['/dashboard/course-detail'], {
      queryParams: { course: courseId },
    });
  }

  goToRecommended(): void {
    this.router.navigate(['/dashboard/recommended-courses']);
  }

  goToAllCourses(): void {
    this.router.navigate(['/dashboard/my-courses']);
  }
}
