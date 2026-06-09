import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CourseDetailService } from '../../core/services/course-detail.service';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';
import { SplitPipe } from '../../shared/pipes/split.pipe';
import { CommonModule } from '@angular/common';
import { UploadVideoService } from '../../core/services/upload-video.service';
import { UploadFileService } from '../../core/services/upload-file.service';
import { AccountStateService } from '../../core/services/account-state.service';
import { API_BASE_URL } from '../../core/config/api.config';
declare var bootstrap: any;

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, ImagePathPipe, SplitPipe]
})
export class CourseDetailComponent implements OnInit, OnDestroy {
  courseId: string | null;
  courseDetail: any = null;
  isLoading: boolean = false;
  isAddingLearning: boolean = false;
  isAllExpanded: boolean = false;
  isAddingFaq: boolean = false;
  showDeleteModal: boolean = false;
  private tooltipInstances: any[] = [];
  itemToDelete: { type: string, idx1: number, idx2: number | null } | null = null;
  error: string | null = null;
  currentVideoUrl: SafeResourceUrl | SafeUrl | null = null;
  currentVideoTitle: string = '';
  isYouTube: boolean = false;
  isImage: boolean = false;
  isPdf: boolean = false;
  isOfficeDoc: boolean = false;
  currentRawUrl: string = '';
  completedLectures: Set<string> = new Set();
  countdown: { hours: string, minutes: string, seconds: string } | null = null;
  private activeVideoPath: string | null = null;
  private lastSavedTime: number = 0;
  private readonly SAVE_INTERVAL = 5; // Save every 5 seconds
  private timerInterval: any;

  constructor(
    private route: ActivatedRoute,
    private courseDetailService: CourseDetailService,
    private accountStateService: AccountStateService,
    private uploadVideoService: UploadVideoService,
    private uploadFileService: UploadFileService,
    private sanitizer: DomSanitizer
  ) {
    this.courseId = this.route.snapshot.queryParamMap.get('course');
  }

  ngOnInit(): void {
    if (this.courseId) {
      this.fetchCourseDetail();
      this.startCountdown();
    } else {
      this.error = 'No course ID provided';
    }
  }

  /**
   * Starts a countdown timer that resets at midnight to create consistent FOMO.
   */
  private startCountdown(): void {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      this.countdown = {
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0')
      };
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  fetchCourseDetail(): void {
    if (!this.courseId) return;

    this.isLoading = true;
    this.error = null;

    this.courseDetailService.getCourseDetailById(this.courseId).subscribe({
      next: (response) => {
        this.courseDetail = response;
        this.loadVideoPaths();
        this.loadFiles();
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

  /**
   * Fetches all video records for the course and attaches videoPath to matching lectures.
   */
  private loadVideoPaths(): void {
    if (!this.courseId || !this.courseDetail?.[0]?.curriculum) return;

    this.uploadVideoService.getVideosByCourseId(this.courseId).subscribe({
      next: (videos: any[]) => {
        if (!Array.isArray(videos)) return;

        // Iterate through the curriculum to find matching video records
        this.courseDetail[0].curriculum.forEach((section: any) => {
          const topicId = section.topicId;
          section.lectures?.forEach((lecture: any) => {
            const lectureId = lecture.lectureId;
            // Filter all video metadata that matches this specific topic and lecture
            lecture.videoList = videos
              .filter(v => v.topicId === topicId && v.lectureId === lectureId)
              .map(v => {
                const rawPath = v.youTubeLink || v.videoPath || '';
                return {
                  title: v.title,
                  videoPath: rawPath.startsWith('http') ? rawPath : (rawPath ? `${API_BASE_URL}/${rawPath}` : ''),
                  duration: v.duration,
                  isYouTube: !!v.youTubeLink,
                  progress: 0 // Initialize progress property for each video
                };
              });
          });
        });

        // Initialize tooltips after the next DOM render cycle
        this.initializeTooltips();
      }
    });
  }

  /**
   * Fetches all file records for the course and attaches them to matching lectures.
   */
  private loadFiles(): void {
    if (!this.courseId || !this.courseDetail?.[0]?.curriculum) return;

    this.uploadFileService.getFilesByCourseId(this.courseId).subscribe({
      next: (files: any[]) => {
        if (!Array.isArray(files)) return;

        this.courseDetail[0].curriculum.forEach((section: any) => {
          const topicId = section.topicId;
          section.lectures?.forEach((lecture: any) => {
            const lectureId = lecture.lectureId;
            lecture.fileList = files
              .filter(f => f.topicId === topicId && f.lectureId === lectureId)
              .map(f => ({
                id: f._id,
                title: f.title,
                filePath: f.filePath ? `${API_BASE_URL}/${f.filePath}` : '',
                fileName: f.fileName || f.title
              }));
          });
        });
      }
    });
  }

  /**
   * Initializes Bootstrap tooltips for all elements with data-bs-toggle="tooltip"
   */
  private initializeTooltips(): void {
    setTimeout(() => {
      // Clean up previous instances if this is called multiple times (e.g. on data refresh)
      this.tooltipInstances.forEach(t => t.dispose());

      const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      this.tooltipInstances = tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }, 0);
  }

  /**
   * Calculates the total number of lectures across all curriculum sections.
   */
  getTotalLectures(): number {
    let total = 0;
    if (this.courseDetail?.[0]?.curriculum) {
      this.courseDetail[0].curriculum.forEach((section: any) => {
        total += section.lectures?.length || 0;
      });
    }
    return total;
  }

  /**
   * Calculates the percentage of completed lectures.
   */
  getCompletionPercentage(): number {
    const total = this.getTotalLectures();
    if (total === 0) return 0;
    const completedCount = this.completedLectures.size;
    // Ensure we don't exceed 100% if the set contains IDs not in the current curriculum
    return Math.min(Math.round((completedCount / total) * 100), 100);
  }

  /**
   * Opens the media player modal and sets the safe URL.
   */
  openVideoModal(item: any): void {
    this.currentVideoTitle = item.title || 'Preview';
    const rawUrl = item.videoPath || item.filePath;
    this.activeVideoPath = rawUrl;
    this.currentRawUrl = rawUrl;

    // Reset flags
    this.isYouTube = false;
    this.isImage = false;
    this.isPdf = false;
    this.isOfficeDoc = false;

    const youtubeId = this.extractYouTubeId(rawUrl);
    if (youtubeId) {
      this.isYouTube = true;
      const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
      this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    } else if (this.isImageFile(rawUrl)) {
      this.isImage = true;
      this.currentVideoUrl = this.sanitizer.bypassSecurityTrustUrl(rawUrl);
    } else if (this.isPdfFile(rawUrl)) {
      this.isPdf = true;
      this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    } else if (this.isOfficeFile(rawUrl)) {
      this.isOfficeDoc = true;
      const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;
      this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
    } else {
      this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    }

    const modalElement = document.getElementById('videoPlayerModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  /**
   * Triggered when the video metadata is loaded.
   * Seeks to the last saved position if it exists.
   */
  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    const userId = this.accountStateService.getStoredAccountData()?.id;

    if (this.activeVideoPath && userId) {
      this.uploadVideoService.getVideoProgress(userId, this.activeVideoPath).subscribe({
        next: (res) => {
          if (res?.currentTime) {
            video.currentTime = res.currentTime;
            // Update initial UI progress if duration is already known
            if (video.duration) {
              const progressPercent = (res.currentTime / video.duration) * 100;
              this.updateLocalVideoProgress(this.activeVideoPath!, progressPercent);
            }
          }
        }
      });
    }
  }

  /**
   * Saves the current playback position to localStorage.
   */
  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    const userId = this.accountStateService.getStoredAccountData()?.id;

    // 1. Update UI Progress locally for immediate feedback
    if (this.activeVideoPath && video.duration) {
      const progressPercent = (video.currentTime / video.duration) * 100;
      this.updateLocalVideoProgress(this.activeVideoPath, progressPercent);
    }

    // Only sync if significant time has passed (throttling)
    if (this.activeVideoPath && userId && Math.abs(video.currentTime - this.lastSavedTime) > this.SAVE_INTERVAL) {
      this.lastSavedTime = video.currentTime;
      const payload = {
        userId,
        courseId: this.courseId,
        videoPath: this.activeVideoPath,
        currentTime: video.currentTime
      };

      this.uploadVideoService.saveVideoProgress(payload).subscribe({
        error: (err) => console.error('Failed to sync video progress', err)
      });
    }
  }

  /**
   * Updates the progress property of the video in the local curriculum list.
   */
  private updateLocalVideoProgress(videoPath: string, progress: number): void {
    if (!this.courseDetail?.[0]?.curriculum) return;

    for (const section of this.courseDetail[0].curriculum) {
      for (const lecture of section.lectures || []) {
        if (lecture.videoList) {
          const video = lecture.videoList.find((v: any) => v.videoPath === videoPath);
          if (video) {
            video.progress = progress;
            return;
          }
        }
      }
    }
  }

  /**
   * Clears the video data to stop playback.
   */
  closeVideoModal(): void {
    this.currentVideoUrl = null;
    this.currentVideoTitle = '';
    this.activeVideoPath = null;
    this.isYouTube = false;
    this.isImage = false;
    this.isPdf = false;
    this.isOfficeDoc = false;
    this.currentRawUrl = '';
  }

  private isImageFile(path: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
  }

  private isPdfFile(path: string): boolean {
    return path.toLowerCase().endsWith('.pdf') || path.toLowerCase().endsWith('.txt');
  }

  private isOfficeFile(path: string): boolean {
    return /\.(doc|docx|xls|xlsx|ppt|pptx|csv)$/i.test(path);
  }

  getFileIcon(filePath: string): string {
    if (!filePath) return 'bi bi-file-earmark';
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'bi bi-file-earmark-pdf text-danger';
      case 'doc':
      case 'docx': return 'bi bi-file-earmark-word text-primary';
      case 'csv':
      case 'xls':
      case 'xlsx': return 'bi bi-file-earmark-excel text-success';
      case 'png':
      case 'jpg':
      case 'jpeg': return 'bi bi-file-earmark-image text-info';
      default: return 'bi bi-file-earmark';
    }
  }

  downloadFile(item: any): void {
    const url = item.filePath || item.videoPath || this.currentRawUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = item.title || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Toggles the completion status of a lecture.
   */
  toggleLectureCompletion(lectureId: string): void {
    if (this.completedLectures.has(lectureId)) {
      this.completedLectures.delete(lectureId);
    } else {
      this.completedLectures.add(lectureId);
    }
    // Logic to sync with backend can be added here
  }

  /**
   * Toggles all accordion sections in the curriculum.
   */
  toggleAllSections(): void {
    this.isAllExpanded = !this.isAllExpanded;
    const accordionElement = document.getElementById('courseAccordion');
    if (accordionElement) {
      const collapses = accordionElement.querySelectorAll('.accordion-collapse');
      collapses.forEach((collapseEl: any) => {
        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
        this.isAllExpanded ? bsCollapse.show() : bsCollapse.hide();
      });
    }
  }

  /**
   * Extracts YouTube ID from various URL formats.
   */
  private extractYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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

  ngOnDestroy(): void {
    // Dispose all active tooltip instances to prevent memory leaks
    this.tooltipInstances.forEach(t => t.dispose());
    this.tooltipInstances = [];
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}
