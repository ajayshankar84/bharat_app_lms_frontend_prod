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
  imports: [CommonModule, ImagePathPipe, SplitPipe]
})
export class CourseDetailComponent implements OnInit {
  courseId: string | null;
  courseDetail: any = null;
  isLoading: boolean = false;
  isAddingLearning: boolean = false;
  isAddingFaq: boolean = false;
  showDeleteModal: boolean = false;
  itemToDelete: { type: string, idx1: number, idx2: number | null } | null = null;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private courseDetailService: CourseDetailService
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

  fetchCourseDetail(): void {
    if (!this.courseId) return;

    this.isLoading = true;
    this.error = null;

    this.courseDetailService.getCourseDetailById(this.courseId).subscribe({
      next: (response) => {
        this.courseDetail = response;
        console.log('Course detail fetched successfully:', this.courseDetail);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching course detail:', error);
        this.error = error?.error?.message || 'Failed to load course details';
        this.isLoading = false;
      },
    });
  }

  // Implement Update/Add logic for Learning Outcomes
  addLearningItem(item: string): void {
    if (item && item.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        whatYouWillLearn: [...(this.courseDetail[0].whatYouWillLearn || []), item.trim()]
      };

      this.saveUpdate(updatedDetail);
    }
    this.isAddingLearning = false;
  }

  // Generic method to handle the API update
  private saveUpdate(updatedDetail: any): void {
    if (!this.courseId) return;
    this.isLoading = true;
    this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
      next: () => {
        this.courseDetail[0] = updatedDetail;
        this.isLoading = false;
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('Error updating course:', err);
        this.error = 'Failed to update course detail.';
        this.isLoading = false;
        this.closeDeleteModal();
      }
    });
  }

  openDeleteModal(type: string, idx1: number, idx2: number | null = null): void {
    this.itemToDelete = { type, idx1, idx2 };
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  deleteItem(): void {
    if (!this.itemToDelete || !this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

    const { type, idx1, idx2 } = this.itemToDelete;
    const updatedDetail = { ...this.courseDetail[0] };

    switch (type) {
      case 'learning':
        updatedDetail.whatYouWillLearn = [...(updatedDetail.whatYouWillLearn || [])];
        updatedDetail.whatYouWillLearn.splice(idx1, 1);
        break;
      case 'faq':
        const updatedFaq = [...(updatedDetail.faq || [])];
        updatedFaq.splice(idx1, 1);
        updatedDetail.faq = updatedFaq;
        break;
      case 'curriculum':
        const updatedCurriculum = [...(updatedDetail.curriculum || [])];
        if (idx2 !== null) {
          const lectures = [...(updatedCurriculum[idx1].lectures || [])];
          lectures.splice(idx2, 1);
          updatedCurriculum[idx1] = { ...updatedCurriculum[idx1], lectures };
        } else {
          updatedCurriculum.splice(idx1, 1);
        }
        updatedDetail.curriculum = updatedCurriculum;
        break;
      case 'project':
        updatedDetail.handsOnProjects = [...(updatedDetail.handsOnProjects || [])];
        updatedDetail.handsOnProjects.splice(idx1, 1);
        break;
      case 'mentorship':
        updatedDetail.mentorshipAndAssessment = [...(updatedDetail.mentorshipAndAssessment || [])];
        updatedDetail.mentorshipAndAssessment.splice(idx1, 1);
        break;
      case 'perk':
        updatedDetail.perksAndBenefits = [...(updatedDetail.perksAndBenefits || [])];
        updatedDetail.perksAndBenefits.splice(idx1, 1);
        break;
      case 'eligibility':
        updatedDetail.eligibility = [...(updatedDetail.eligibility || [])];
        updatedDetail.eligibility.splice(idx1, 1);
        break;
    }

    this.saveUpdate(updatedDetail);
  }

  addFaqItem(question: string, answer: string): void {
    if (question?.trim() && answer?.trim()) {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;
      const newFaq = { question: question.trim(), answer: answer.trim() };
      const updatedDetail = {
        ...this.courseDetail[0],
        faq: [...(this.courseDetail[0].faq || []), newFaq]
      };
      this.saveUpdate(updatedDetail);
    }
    this.isAddingFaq = false;
  }
}
