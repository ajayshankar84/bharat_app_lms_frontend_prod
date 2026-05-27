import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService, UserInfo } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { SessionService } from '../core/services/session.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
})
export class FeaturesComponent implements OnInit {
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  isSidebarOpen = false;
  isMobile = false;
  isProfileMenuOpen = false;
  isLoggingOut = false;
  user: UserInfo | null = null;

  readonly userNavItems: NavItem[] = [
    {
      path: '/dashboard/dashboard-v1',
      icon: 'bi-speedometer2',
      label: 'Dashboard',
    },
    { path: '/dashboard/my-courses', icon: 'bi-book', label: 'My Courses' },
    {
      path: '/dashboard/recommended-courses',
      icon: 'bi-star',
      label: 'Recommended',
    },
    {
      path: '/dashboard/course-detail',
      icon: 'bi-check2-circle',
      label: 'Completed',
    },
  ];

  readonly adminNavItems: NavItem[] = [
    {
      path: '/dashboard/dashboard-v2',
      icon: 'bi-speedometer2',
      label: 'Dashboard',
    },
    {
      path: '/dashboard/assigned-course',
      icon: 'bi-clipboard2-check',
      label: 'Assigned Courses',
    },
    {
      path: '/dashboard/create-course',
      icon: 'bi-plus-square',
      label: 'Create Course',
    },
    {
      path: '/dashboard/courses',
      icon: 'bi-journal-bookmark',
      label: 'All Courses',
    },
    {
      path: '/dashboard/course-content',
      icon: 'bi-collection-play',
      label: 'Course Content',
    },
  ];

  get isAdmin(): boolean {
    return this.sessionService.isAdmin();
  }

  get navItems(): NavItem[] {
    return this.isAdmin ? this.adminNavItems : this.userNavItems;
  }

  get userInitials(): string {
    const name = this.user?.name || this.user?.username || 'U';
    return name.charAt(0).toUpperCase();
  }

  get displayName(): string {
    return this.user?.name || this.user?.username || 'User';
  }

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 992;
    if (!this.isMobile) {
      this.isSidebarOpen = true;
    } else {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebarOnMobile(): void {
    if (this.isMobile) {
      this.isSidebarOpen = false;
    }
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.isLoggingOut = true;
    setTimeout(() => {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    }, 400);
  }
}
