import { Component } from '@angular/core';

interface RecommendedCourse {
  id: string;
  title: string;
  instructor: string;
  rating: number;
  reviews: number;
  price: number;
  finalPrice: number;
  duration: string;
  level: string;
  category: string;
  categoryIcon: string;
  bestseller: boolean;
  trending: boolean;
  variant: string;
  icon: string;
  bookmarked: boolean;
  topic: string;
}

interface CategoryChip {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-recommended-courses',
  templateUrl: './recommended-courses.component.html',
  styleUrls: ['./recommended-courses.component.scss'],
})
export class RecommendedCoursesComponent {
  searchTerm = '';
  activeCategory: string = 'all';

  categories: CategoryChip[] = [
    { label: 'All', value: 'all', icon: 'bi-grid' },
    { label: 'AI & ML', value: 'ai', icon: 'bi-robot' },
    { label: 'Development', value: 'dev', icon: 'bi-code-slash' },
    { label: 'Design', value: 'design', icon: 'bi-palette' },
    { label: 'Business', value: 'business', icon: 'bi-briefcase' },
  ];

  recommendedCourses: RecommendedCourse[] = [
    {
      id: '1',
      title: 'The Complete Prompt Engineering for AI Bootcamp',
      instructor: 'Mike Taylor, James Phoenix',
      rating: 4.8,
      reviews: 143834,
      price: 799,
      finalPrice: 399,
      duration: '12h',
      level: 'Beginner',
      category: 'AI & ML',
      categoryIcon: 'bi-robot',
      bestseller: true,
      trending: false,
      variant: 'course-card__media--gradient-1',
      icon: 'bi-robot',
      bookmarked: false,
      topic: 'ai',
    },
    {
      id: '2',
      title: 'The Complete AI Guide: Learn ChatGPT, Claude & Generative AI',
      instructor: 'Julian Melanson, Benza Maman',
      rating: 4.7,
      reviews: 60406,
      price: 2559,
      finalPrice: 399,
      duration: '24h',
      level: 'Intermediate',
      category: 'AI & ML',
      categoryIcon: 'bi-chat-square-dots',
      bestseller: true,
      trending: true,
      variant: 'course-card__media--gradient-2',
      icon: 'bi-chat-square-dots-fill',
      bookmarked: false,
      topic: 'ai',
    },
    {
      id: '3',
      title: 'AI Coder: Complete Claude Code & Coding Agents Course',
      instructor: 'Ligency, Ed Donner',
      rating: 4.6,
      reviews: 5640,
      price: 1919,
      finalPrice: 399,
      duration: '18h',
      level: 'Advanced',
      category: 'Development',
      categoryIcon: 'bi-code-slash',
      bestseller: true,
      trending: false,
      variant: 'course-card__media--gradient-3',
      icon: 'bi-code-slash',
      bookmarked: true,
      topic: 'dev',
    },
    {
      id: '4',
      title: 'Generative AI for Beginners',
      instructor: 'Aakriti E-Learning Academy',
      rating: 4.9,
      reviews: 112749,
      price: 799,
      finalPrice: 399,
      duration: '8h',
      level: 'Beginner',
      category: 'AI & ML',
      categoryIcon: 'bi-stars',
      bestseller: true,
      trending: true,
      variant: 'course-card__media--gradient-4',
      icon: 'bi-stars',
      bookmarked: false,
      topic: 'ai',
    },
    {
      id: '5',
      title: 'Claude Code - The Practical Guide',
      instructor: 'Academind by Maximilian Schwarzmüller',
      rating: 4.8,
      reviews: 8580,
      price: 1919,
      finalPrice: 399,
      duration: '15h',
      level: 'Intermediate',
      category: 'Development',
      categoryIcon: 'bi-lightning-charge',
      bestseller: false,
      trending: false,
      variant: 'course-card__media--gradient-5',
      icon: 'bi-lightning-charge-fill',
      bookmarked: false,
      topic: 'dev',
    },
    {
      id: '6',
      title: 'UX/UI Design Masterclass with Figma',
      instructor: 'Sarah Chen',
      rating: 4.9,
      reviews: 22480,
      price: 1499,
      finalPrice: 499,
      duration: '20h',
      level: 'Beginner',
      category: 'Design',
      categoryIcon: 'bi-palette',
      bestseller: true,
      trending: false,
      variant: 'course-card__media--gradient-6',
      icon: 'bi-palette-fill',
      bookmarked: false,
      topic: 'design',
    },
  ];

  get filteredCourses(): RecommendedCourse[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.recommendedCourses.filter((c) => {
      const matchesSearch =
        !term ||
        c.title.toLowerCase().includes(term) ||
        c.instructor.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term);

      const matchesCategory =
        this.activeCategory === 'all' || c.topic === this.activeCategory;

      return matchesSearch && matchesCategory;
    });
  }

  getDiscount(price: number, finalPrice: number): number {
    if (!price || price <= 0) return 0;
    return Math.round(((price - finalPrice) / price) * 100);
  }

  toggleBookmark(course: RecommendedCourse): void {
    course.bookmarked = !course.bookmarked;
  }
}
