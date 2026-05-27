import { Component } from '@angular/core';

interface MyCourse {
  id: string;
  title: string;
  instructor: string;
  rating: number;
  reviews: number;
  price: number;
  finalPrice: number;
  progress: number;
  bestseller: boolean;
  variant: string;
  icon: string;
}

@Component({
  selector: 'app-my-courses',
  templateUrl: './my-courses.component.html',
  styleUrls: ['./my-courses.component.scss'],
})
export class MyCoursesComponent {
  searchTerm = '';
  activeFilter: 'all' | 'progress' | 'completed' = 'all';

  myCourses: MyCourse[] = [
    {
      id: '1',
      title: 'The Complete Prompt Engineering for AI Bootcamp',
      instructor: 'Mike Taylor, James Phoenix',
      rating: 4.8,
      reviews: 143834,
      price: 799,
      finalPrice: 399,
      progress: 68,
      bestseller: true,
      variant: 'course-card__media--gradient-1',
      icon: 'bi-robot',
    },
    {
      id: '2',
      title: 'The Complete AI Guide: Learn ChatGPT, Claude & Generative AI',
      instructor: 'Julian Melanson, Benza Maman, Leap Year',
      rating: 4.7,
      reviews: 60406,
      price: 2559,
      finalPrice: 399,
      progress: 22,
      bestseller: true,
      variant: 'course-card__media--gradient-2',
      icon: 'bi-chat-square-dots-fill',
    },
    {
      id: '3',
      title: 'AI Coder: Complete Claude Code & Coding Agents Course',
      instructor: 'Ligency, Ed Donner',
      rating: 4.6,
      reviews: 5640,
      price: 1919,
      finalPrice: 399,
      progress: 45,
      bestseller: true,
      variant: 'course-card__media--gradient-3',
      icon: 'bi-code-slash',
    },
    {
      id: '4',
      title: 'Generative AI for Beginners',
      instructor: 'Aakriti E-Learning Academy',
      rating: 4.9,
      reviews: 112749,
      price: 799,
      finalPrice: 399,
      progress: 100,
      bestseller: true,
      variant: 'course-card__media--gradient-4',
      icon: 'bi-stars',
    },
    {
      id: '5',
      title: 'Claude Code - The Practical Guide',
      instructor: 'Academind by Maximilian Schwarzmüller',
      rating: 4.8,
      reviews: 8580,
      price: 1919,
      finalPrice: 399,
      progress: 12,
      bestseller: false,
      variant: 'course-card__media--gradient-5',
      icon: 'bi-lightning-charge-fill',
    },
  ];

  get filteredCourses(): MyCourse[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.myCourses.filter((c) => {
      const matchesSearch =
        !term ||
        c.title.toLowerCase().includes(term) ||
        c.instructor.toLowerCase().includes(term);

      const matchesFilter =
        this.activeFilter === 'all' ||
        (this.activeFilter === 'progress' &&
          c.progress > 0 &&
          c.progress < 100) ||
        (this.activeFilter === 'completed' && c.progress >= 100);

      return matchesSearch && matchesFilter;
    });
  }

  getDiscount(price: number, finalPrice: number): number {
    if (!price || price <= 0) return 0;
    return Math.round(((price - finalPrice) / price) * 100);
  }
}
