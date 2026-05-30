import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CourseService } from '../../core/services/course.service';
import { CourseDetailService } from '../../core/services/course-detail.service';
import { UploadVideoService } from '../../core/services/upload-video.service';
import { API_BASE_URL } from '../../core/config/api.config';

declare var bootstrap: any;

@Component({
  selector: 'app-upload-video',
  templateUrl: './upload-video.component.html',
  styleUrls: ['./upload-video.component.scss']
})
export class UploadVideoComponent implements OnInit, OnDestroy {
  uploadForm!: FormGroup;
  courses: any[] = [];
  topics: any[] = [];
  lectures: any[] = [];
  existingCourseVideoPaths: any[] = [];
  existingVideoPaths: any[] = [];
  existingLectureVideoPaths: any[] = [];
  selectedFile: File | null = null;
  uploadProgress = 0;
  isSubmitting = false;
  errorMessage: string | null = null;
  currentVideoUrl: SafeResourceUrl | null = null;
  currentVideoTitle: string = '';
  isYouTube: boolean = false;
  showDeleteConfirmModal = false;
  videoIdToDelete: string | null = null;
  private destroy$ = new Subject<void>();
  private readonly YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private courseDetailService: CourseDetailService,
    private uploadVideoService: UploadVideoService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.setupFormListeners();
    this.loadCourses();
  }

  private initForm(): void {
    this.uploadForm = this.fb.group({
      courseId: ['', Validators.required],
      topicId: ['', Validators.required],
      lectureId: ['', Validators.required],
      title: ['', Validators.required],
      description: [''],
      videoPath: [''],
      uploadType: ['file'],
      youTubeLink: ['']
    });
  }

  private setupFormListeners(): void {
    // Reactively load topics when a course is selected
    this.uploadForm.get('courseId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(courseId => {
        if (courseId) {
          this.loadTopics(courseId);
          this.loadExistingCourseVideos(courseId);
        } else {
          this.topics = [];
          this.existingCourseVideoPaths = [];
          this.existingVideoPaths = [];
          this.existingLectureVideoPaths = [];
          this.uploadForm.get('topicId')?.reset('');
          this.lectures = [];
          this.uploadForm.get('lectureId')?.reset('');
        }
      });

    // Reactively load lectures when a topic is selected
    this.uploadForm.get('topicId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(topicId => {
        const courseId = this.uploadForm.get('courseId')?.value;

        if (courseId && topicId) {
          this.loadLectures(courseId, topicId);
          this.loadExistingVideos(courseId, topicId);
        } else {
          this.lectures = [];
          this.uploadForm.get('lectureId')?.reset('');
          this.existingVideoPaths = [];
          this.existingLectureVideoPaths = [];
        }
      });

    // Reactively load lecture-specific videos when a lecture is selected
    this.uploadForm.get('lectureId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(lectureId => {
        const courseId = this.uploadForm.get('courseId')?.value;
        const topicId = this.uploadForm.get('topicId')?.value;

        if (courseId && topicId && lectureId) {
          this.loadExistingLectureVideos(courseId, topicId, lectureId);
        } else {
          this.existingLectureVideoPaths = [];
        }
      });

    // Handle logic when switching between file upload and link
    this.uploadForm.get('uploadType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        const linkControl = this.uploadForm.get('youTubeLink');
        if (type === 'link') {
          linkControl?.setValidators([Validators.required, Validators.pattern(this.YOUTUBE_REGEX)]);
          this.selectedFile = null;
        } else {
          linkControl?.clearValidators();
          linkControl?.reset('');
        }
        linkControl?.updateValueAndValidity();
      });
  }

  private async loadCourses() {
    try {
      const data = await lastValueFrom(this.courseService.getCourses());
      this.courses = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading courses', error);
      this.courses = [];
    }
  }

  private async loadTopics(courseId: string) {
    try {
      const response = await lastValueFrom(this.courseDetailService.getCourseDetailById(courseId));
      // Handle the response which is typically an array of details
      const detail = Array.isArray(response) ? response[0] : response;

      this.topics = (detail?.curriculum || []).map((item: any, index: number) => ({
        id: item.topicId || index,
        title: item.topics // Extracting the topic name from the curriculum object
      }));
      this.uploadForm.get('topicId')?.reset('');
      this.lectures = [];
      this.uploadForm.get('lectureId')?.reset('');
    } catch (error) {
      console.error('Error loading topics', error);
      this.topics = [];
      this.lectures = [];
    }
  }

  /**
   * Fetches all existing video paths for the selected course.
   */
  private async loadExistingCourseVideos(courseId: string) {
    try {
      const data: any = await lastValueFrom(this.uploadVideoService.getVideosByCourseId(courseId));
      this.existingCourseVideoPaths = this.mapVideoResponse(data);
    } catch (error) {
      console.error('Error loading course videos', error);
      this.existingCourseVideoPaths = [];
    }
  }

  /**
   * Fetches existing video paths for the selected course and topic, and stores them in an array.
   */
  private async loadExistingVideos(courseId: string, topicId: string) {
    try {
      // Use the new method to fetch videos for specific course and topic
      const data: any = await lastValueFrom(this.uploadVideoService.getVideosByCourseIdTopicId(courseId, topicId));
      this.existingVideoPaths = this.mapVideoResponse(data);
    } catch (error) {
      console.error('Error loading existing videos', error);
      this.existingVideoPaths = [];
    }
  }

  /**
   * Fetches existing video paths for the selected course, topic, and lecture.
   */
  private async loadExistingLectureVideos(courseId: string, topicId: string, lectureId: string) {
    try {
      const data: any = await lastValueFrom(this.uploadVideoService.getVideosByCourseIdTopicIdLectureId(courseId, topicId, lectureId));
      this.existingLectureVideoPaths = this.mapVideoResponse(data);
    } catch (error) {
      console.error('Error loading lecture videos', error);
      this.existingLectureVideoPaths = [];
    }
  }

  /**
   * Maps the API response to an array of objects containing title and videoPath.
   */
  private mapVideoResponse(data: any): any[] {
    return Array.isArray(data) ? data.map((item: any) => {
      const rawPath = item.youTubeLink || item.videoPath || '';
      return {
        id: item._id,
        title: item.title,
        videoPath: rawPath.startsWith('http') ? rawPath : (rawPath ? `${API_BASE_URL}/${rawPath}` : ''),
        duration: item.duration,
        isYouTube: !!item.youTubeLink
      };
    }).filter((v: any) => v.videoPath) : [];
  }

  /**
   * Triggered when the delete icon is clicked. Sets state to show custom modal.
   * @param videoId The ID of the video to delete.
   */
  deleteVideo(videoId: string): void {
    if (!videoId) return;
    this.videoIdToDelete = videoId;
    this.showDeleteConfirmModal = true;
  }

  /**
   * Performs the actual deletion via the service after user confirms in the modal.
   */
  confirmDelete(): void {
    if (!this.videoIdToDelete) return;
    this.uploadVideoService.deleteVideo(this.videoIdToDelete).subscribe({
      next: () => {
        const courseId = this.uploadForm.get('courseId')?.value;
        const topicId = this.uploadForm.get('topicId')?.value;
        const lectureId = this.uploadForm.get('lectureId')?.value;

        if (courseId) this.loadExistingCourseVideos(courseId);
        if (courseId && topicId) this.loadExistingVideos(courseId, topicId);
        if (courseId && topicId && lectureId) this.loadExistingLectureVideos(courseId, topicId, lectureId);
        
        this.closeDeleteConfirmModal();
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.errorMessage = 'Failed to delete the video.';
        this.closeDeleteConfirmModal();
      }
    });
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.videoIdToDelete = null;
  }

  /**
   * Opens the video player modal and sets the safe URL.
   */
  openVideoModal(video: any): void {
    this.currentVideoTitle = video.title || 'Video Preview';
    const rawUrl = video.videoPath;
    const youtubeId = this.extractYouTubeId(rawUrl);

    if (youtubeId) {
      this.isYouTube = true;
      const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
      this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    } else {
      this.isYouTube = false;
      this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    }

    const modalElement = document.getElementById('videoPlayerModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  /**
   * Clears the video data to stop playback.
   */
  closeVideoModal(): void {
    this.currentVideoUrl = null;
    this.currentVideoTitle = '';
    this.isYouTube = false;
  }

  /**
   * Extracts YouTube ID from various URL formats.
   */
  private extractYouTubeId(url: string): string | null {
    const match = url.match(this.YOUTUBE_REGEX);
    if (match) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const idMatch = url.match(regExp);
      return (idMatch && idMatch[2].length === 11) ? idMatch[2] : null;
    }
    return null;
  }

  private async loadLectures(courseId: string, topicId: string) {
    try {
      const data = await lastValueFrom(this.courseDetailService.getCourseDetailByCourseIdByTopicID(courseId, topicId));
      this.lectures = data?.lectures || [];
      this.uploadForm.get('lectureId')?.reset('');
    } catch (error) {
      console.error('Error loading lectures', error);
      this.lectures = [];
    }
  }

  /**
   * Handles the file selection from the input element.
   * Includes a basic check to ensure the selected file is a video.
   */
  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      if (file.type.startsWith('video/')) {
        this.selectedFile = file;
        this.errorMessage = null;
      } else {
        this.selectedFile = null;
        this.errorMessage = 'Please select a valid video file.';
        element.value = ''; // Reset the input
      }
    }
  }

  /**
   * Submits the form data and the video file to the server.
   * Uses FormData to package the file and metadata.
   */
  onSubmit(): void {
    const isFileMode = this.uploadForm.get('uploadType')?.value === 'file';

    if (this.uploadForm.invalid || (isFileMode && !this.selectedFile)) {
      this.uploadForm.markAllAsTouched();
      if (isFileMode && !this.selectedFile) {
        this.errorMessage = 'Please select a video file to upload.';
      }
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.uploadProgress = 0;

    const formValues = this.uploadForm.value;

    // Find the labels (names) for topic and lecture based on the selected IDs
    const selectedTopic = this.topics.find(t => t.id === formValues.topicId);
    const selectedLecture = this.lectures.find(l => l.lectureId === formValues.lectureId);

    // Prepare the payload for the service
    const payload = {
      video: this.selectedFile,
      ...formValues,
      topic: selectedTopic?.title || '',
      lecture: selectedLecture?.lecture || ''
    };

    this.uploadVideoService.uploadVideo(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (event: any) => {
          // Handle real-time upload progress
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress = Math.round((100 * event.loaded) / event.total);
          } 
          // Handle final response
          else if (event instanceof HttpResponse) {
            this.router.navigate(['/features/courses']);
          }
        },
        error: (err: any) => {
          console.error('Upload failed', err);
          this.errorMessage = 'An error occurred during the upload. Please try again.';
        }
      });
  }

  /**
   * Aborts the ongoing upload by triggering the destroy$ subject.
   * Because destroy$ also manages form listeners, we re-setup them
   * to keep the dropdowns functional for a retry.
   */
  cancelUpload(): void {
    this.destroy$.next();
    this.isSubmitting = false;
    this.uploadProgress = 0;
    this.errorMessage = 'Upload cancelled by user.';
    // Re-establish listeners that were terminated by destroy$.next()
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}