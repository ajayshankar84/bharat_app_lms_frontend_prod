import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CourseDetailService } from '../../core/services/course-detail.service';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-content',
  templateUrl: './course-content.component.html',
  styleUrls: ['./course-content.component.scss'],
  standalone: true,
  imports: [CommonModule, DragDropModule, ImagePathPipe]
})
export class CourseContentComponent implements OnInit {
  courseId: string | null;
  courseDetail: any = null;
  isLoading: boolean = false;
  isAddingCurriculum: boolean = false; // Added property
  isAddingLearning: boolean = false; // Added property for Learning outcomes
  isAddingProject: boolean = false; // Added property for Projects
  isAddingMentorship: boolean = false; // Added property for Mentorship
  isAddingEligibility: boolean = false; // Added property for Eligibility
  isAddingPerk: boolean = false; // Added property for Perks
  isAddingFaq: boolean = false; // Added property for FAQ
  isEditingPageTitle: boolean = false; // Added property for Page Title
  isEditingPageSubTitle: boolean = false; // Added property for Page Sub-title
  isEditingDescription: boolean = false; // Added property for Description
  isEditingAbout: boolean = false; // Added property for About
  isEditingDuration: boolean = false; // Added property for Duration
  isEditingPrice: boolean = false; // Added property for Price
  isEditingFinalPrice: boolean = false; // Added property for Final Price
  isEditingDiscount: boolean = false; // Added property for Discount
  isEditingSeatsLeft: boolean = false; // Added property for Seats Left
  isEditingSeatsFilled: boolean = false; // Added property for Seats Filled
  isEditingProgress: boolean = false; // Added property for Progress
  addingSubItemIndex: number | null = null; // Added property to track sub-item index
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
      next: (response: any) => {
        this.courseDetail = response;
        console.log('Course detail fetched successfully:', this.courseDetail);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error fetching course detail:', error);
        this.error = error?.error?.message || 'Failed to load course details';
        this.isLoading = false;
      },
    });
  }

  // New method to handle adding curriculum items
  addCurriculumItem(item: string): void {
    if (item && item.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const newEntry = {
        week: `Week ${(this.courseDetail[0].curriculum?.length || 0) + 1}`,
        topics: item.trim(),
        lectures: ['Introduction to Module', 'Hands-on Exercise'],
        outcome: 'Completed Module Milestone'
      };

      const updatedDetail = {
        ...this.courseDetail[0],
        curriculum: [...(this.courseDetail[0].curriculum || []), newEntry]
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('Error updating course curriculum:', err);
          this.error = 'Failed to update curriculum. Please try again.';
          this.isLoading = false;
        }
      });
    }
    this.isAddingCurriculum = false; // Hide the input after adding or cancelling
  }

  // New method to handle adding Learning items
  addLearningItem(item: string): void {
    if (item && item.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        whatYouWillLearn: [...(this.courseDetail[0].whatYouWillLearn || []), item.trim()]
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating learning outcomes:', error);
          this.error = error?.error?.message || 'Failed to update learning outcomes.';
          this.isLoading = false;
        }
      });
    }
    this.isAddingLearning = false;
  }

  // New method to handle adding Project items
  addProjectItem(item: string): void {
    if (item && item.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        handsOnProjects: [...(this.courseDetail[0].handsOnProjects || []), item.trim()]
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating hands on projects:', error);
          this.error = error?.error?.message || 'Failed to update hands on projects.';
          this.isLoading = false;
        }
      });
    }
    this.isAddingProject = false;
  }

  // New method to handle adding Mentorship items
  addMentorshipItem(item: string): void {
    if (item && item.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        mentorshipAndAssessment: [...(this.courseDetail[0].mentorshipAndAssessment || []), item.trim()]
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating mentorship:', error);
          this.error = error?.error?.message || 'Failed to update mentorship.';
          this.isLoading = false;
        }
      });
    }
    this.isAddingMentorship = false;
  }

  // New method to handle adding Eligibility items
  addEligibilityItem(item: string): void {
    if (item && item.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        eligibility: [...(this.courseDetail[0].eligibility || []), item.trim()]
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating eligibility:', error);
          this.error = error?.error?.message || 'Failed to update eligibility.';
          this.isLoading = false;
        }
      });
    }
    this.isAddingEligibility = false;
  }

  // New method to handle adding Perks items
  addPerkItem(item: string): void {
    if (item && item.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        perksAndBenefits: [...(this.courseDetail[0].perksAndBenefits || []), item.trim()]
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating perks:', error);
          this.error = error?.error?.message || 'Failed to update perks.';
          this.isLoading = false;
        }
      });
    }
    this.isAddingPerk = false;
  }

  // Method to handle updating the Page Title
  updatePageTitle(title: string): void {
    if (title && title.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        pageTitle: title.trim()
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating page title:', error);
          this.error = error?.error?.message || 'Failed to update page title.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingPageTitle = false;
  }

  // Method to handle updating the Page Sub-title
  updatePageSubTitle(subTitle: string): void {
    if (subTitle && subTitle.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        pageSubTitle: subTitle.trim()
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating page sub-title:', error);
          this.error = error?.error?.message || 'Failed to update page sub-title.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingPageSubTitle = false;
  }

  // Method to handle updating the Course Description
  updateDescription(description: string): void {
    if (description && description.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        description: description.trim()
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          this.error = error?.error?.message || 'Failed to update description.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingDescription = false;
  }

  // Method to handle updating the About section
  updateAbout(about: string): void {
    if (about && about.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        about: about.trim()
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          this.error = error?.error?.message || 'Failed to update about section.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingAbout = false;
  }

  // Method to handle updating the Course Duration
  updateDuration(duration: string): void {
    if (duration && duration.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        duration: duration.trim()
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          this.error = error?.error?.message || 'Failed to update duration.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingDuration = false;
  }

  // Method to handle updating the Course Price
  updatePrice(price: string): void {
    if (price && price.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        price: Number(price)
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating price:', error);
          this.error = error?.error?.message || 'Failed to update price.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingPrice = false;
  }

  // Method to handle updating the Final Course Price
  updateFinalPrice(finalPrice: string): void {
    if (finalPrice && finalPrice.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        finalPrice: Number(finalPrice)
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating final price:', error);
          this.error = error?.error?.message || 'Failed to update final price.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingFinalPrice = false;
  }

  // Method to handle updating the Discount percentage
  updateDiscount(discount: string): void {
    if (discount && discount.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        discount: Number(discount)
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating discount:', error);
          this.error = error?.error?.message || 'Failed to update discount.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingDiscount = false;
  }

  // Method to handle updating the Seats Left
  updateSeatsLeft(seats: string): void {
    if (seats && seats.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        openPositions: {
          ...(this.courseDetail[0].openPositions || {}),
          seatsLeft: Number(seats)
        }
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating seats left:', error);
          this.error = error?.error?.message || 'Failed to update seats left.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingSeatsLeft = false;
  }

  // Method to handle updating the Seats Filled
  updateSeatsFilled(seats: string): void {
    if (seats && seats.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        openPositions: {
          ...(this.courseDetail[0].openPositions || {}),
          seatsFilled: seats.trim()
        }
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating seats filled:', error);
          this.error = error?.error?.message || 'Failed to update seats filled.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingSeatsFilled = false;
  }

  // Method to handle updating the Progress Bar Value
  updateProgress(progress: string): void {
    if (progress && progress.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedDetail = {
        ...this.courseDetail[0],
        openPositions: {
          ...(this.courseDetail[0].openPositions || {}),
          progress: Number(progress)
        }
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating progress:', error);
          this.error = error?.error?.message || 'Failed to update progress.';
          this.isLoading = false;
        }
      });
    }
    this.isEditingProgress = false;
  }

  // New method to handle adding FAQ items
  addFaqItem(question: string, answer: string): void {
    if (question?.trim() && answer?.trim()) {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const newFaq = {
        question: question.trim(),
        answer: answer.trim()
      };

      const updatedDetail = {
        ...this.courseDetail[0],
        faq: [...(this.courseDetail[0].faq || []), newFaq]
      };

      this.isLoading = true;
      this.error = null;

      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('Error updating FAQ:', err);
          this.error = 'Failed to update FAQ. Please try again.';
          this.isLoading = false;
        }
      });
    }
    this.isAddingFaq = false;
  }

  // New method to handle adding sub-items (lectures/details) to a specific curriculum section
  addCurriculumSubItem(index: number, content: string): void {
    if (content && content.trim() !== '') {
      if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

      const updatedCurriculum = [...(this.courseDetail[0].curriculum || [])];
      const currentLectures = updatedCurriculum[index].lectures || [];
      
      updatedCurriculum[index] = {
        ...updatedCurriculum[index],
        lectures: [...currentLectures, content.trim()]
      };

      const updatedDetail = {
        ...this.courseDetail[0],
        curriculum: updatedCurriculum
      };

      this.isLoading = true;
      this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
        next: () => {
          this.courseDetail[0] = updatedDetail;
          this.isLoading = false;
        },
        error: (err: any) => {
          this.isLoading = false;
        }
      });
    }
    this.addingSubItemIndex = null;
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
      case 'curriculum':
        const updatedCurriculum = [...(updatedDetail.curriculum || [])];
        if (idx2 !== null) {
          // Delete specific lecture
          const lectures = [...(updatedCurriculum[idx1].lectures || [])];
          lectures.splice(idx2, 1);
          updatedCurriculum[idx1] = { ...updatedCurriculum[idx1], lectures };
        } else {
          // Delete entire section
          updatedCurriculum.splice(idx1, 1);
        }
        updatedDetail.curriculum = updatedCurriculum;
        break;

      case 'faq':
        const updatedFaq = [...(updatedDetail.faq || [])];
        updatedFaq.splice(idx1, 1);
        updatedDetail.faq = updatedFaq;
        break;

      case 'learning':
        updatedDetail.whatYouWillLearn = [...updatedDetail.whatYouWillLearn];
        updatedDetail.whatYouWillLearn.splice(idx1, 1);
        break;

      case 'project':
        updatedDetail.handsOnProjects = [...updatedDetail.handsOnProjects];
        updatedDetail.handsOnProjects.splice(idx1, 1);
        break;

      case 'mentorship':
        updatedDetail.mentorshipAndAssessment = [...updatedDetail.mentorshipAndAssessment];
        updatedDetail.mentorshipAndAssessment.splice(idx1, 1);
        break;

      case 'perk':
        updatedDetail.perksAndBenefits = [...updatedDetail.perksAndBenefits];
        updatedDetail.perksAndBenefits.splice(idx1, 1);
        break;

      case 'eligibility':
        updatedDetail.eligibility = [...updatedDetail.eligibility];
        updatedDetail.eligibility.splice(idx1, 1);
        break;
    }

    this.isLoading = true;
    this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
      next: () => {
        this.courseDetail[0] = updatedDetail;
        this.isLoading = false;
          this.closeDeleteModal();
      },
      error: (err: any) => {
        console.error('Error deleting lecture:', err);
        this.error = 'Failed to delete lecture. Please try again.';
        this.isLoading = false;
          this.closeDeleteModal();
      }
    });
  }

  /**
   * Handles the reordering of curriculum sections via drag and drop.
   */
 drop(event: CdkDragDrop<any[]>) { 
    if (!this.courseDetail || !this.courseDetail[0] || !this.courseId) return;

    const curriculum = [...(this.courseDetail[0].curriculum || [])];
    moveItemInArray(curriculum, event.previousIndex, event.currentIndex);

    const updatedDetail = {
      ...this.courseDetail[0],
      curriculum: curriculum
    };

    this.isLoading = true;
    this.courseDetailService.updateCourseDetail(this.courseId, updatedDetail).subscribe({
      next: () => {
        this.courseDetail[0] = updatedDetail;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error reordering curriculum:', err);
        this.error = 'Failed to reorder curriculum. Please try again.';
        this.isLoading = false;
      }
    });
  }
}