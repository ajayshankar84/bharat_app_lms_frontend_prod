import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CourseService } from '../../core/services/course.service';
import { CourseDetailService } from '../../core/services/course-detail.service';
import { UploadVideoService } from '../../core/services/upload-video.service';
import { UploadFileService } from '../../core/services/upload-file.service';
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
  existingCourseFiles: any[] = [];
  existingVideoPaths: any[] = [];
  existingTopicFiles: any[] = [];
  existingLectureVideoPaths: any[] = [];
  existingLectureFiles: any[] = [];
  selectedFile: File | null = null;
  uploadProgress = 0;
  isSubmitting = false;
  errorMessage: string | null = null;
  currentVideoUrl: SafeResourceUrl | SafeUrl | null = null;
  currentVideoTitle: string = '';
  isYouTube: boolean = false;
  isVideo: boolean = false;
  isImage: boolean = false;
  isPdf: boolean = false;
  isOfficeDoc: boolean = false;
  currentRawUrl: string = '';
  showDeleteConfirmModal = false;
  videoIdToDelete: string | null = null;
  fileIdToDelete: string | null = null;
  private destroy$ = new Subject<void>();
  private readonly YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private courseDetailService: CourseDetailService,
    private uploadVideoService: UploadVideoService,
    private uploadFileService: UploadFileService,
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
          this.loadExistingCourseFiles(courseId);
        } else {
          this.topics = [];
          this.existingCourseVideoPaths = [];
          this.existingCourseFiles = [];
          this.existingVideoPaths = [];
          this.existingTopicFiles = [];
          this.existingLectureVideoPaths = [];
          this.existingLectureFiles = [];
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
          this.loadExistingTopicFiles(courseId, topicId);
        } else {
          this.lectures = [];
          this.uploadForm.get('lectureId')?.reset('');
          this.existingVideoPaths = [];
          this.existingTopicFiles = [];
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
          this.loadExistingLectureFiles(courseId, topicId, lectureId);
        } else {
          this.existingLectureVideoPaths = [];
          this.existingLectureFiles = [];
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
   * Fetches existing files for the selected course.
   */
  private async loadExistingCourseFiles(courseId: string) {
    try {
      const data: any = await lastValueFrom(this.uploadFileService.getFilesByCourseId(courseId));
      this.existingCourseFiles = this.mapFileResponse(data);
    } catch (error) {
      console.error('Error loading course files', error);
      this.existingCourseFiles = [];
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
   * Fetches existing files for the selected topic.
   */
  private async loadExistingTopicFiles(courseId: string, topicId: string) {
    try {
      const data: any = await lastValueFrom(this.uploadFileService.getFilesByCourseIdTopicId(courseId, topicId));
      this.existingTopicFiles = this.mapFileResponse(data);
    } catch (error) {
      console.error('Error loading topic files', error);
      this.existingTopicFiles = [];
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
   * Fetches existing files for the selected lecture.
   */
  private async loadExistingLectureFiles(courseId: string, topicId: string, lectureId: string) {
    try {
      const data: any = await lastValueFrom(this.uploadFileService.getFilesByCourseIdTopicIdLectureId(courseId, topicId, lectureId));
      this.existingLectureFiles = this.mapFileResponse(data);
    } catch (error) {
      console.error('Error loading lecture files', error);
      this.existingLectureFiles = [];
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
   * Maps the API response for files.
   */
  private mapFileResponse(data: any): any[] {
    return Array.isArray(data) ? data.map((item: any) => ({
      id: item._id,
      title: item.title,
      filePath: item.filePath ? `${API_BASE_URL}/${item.filePath}` : '',
      fileName: item.fileName || item.title
    })).filter((f: any) => f.filePath) : [];
  }

  /**
   * Returns a Bootstrap Icon class based on the file extension.
   */
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
   * Triggered when the delete icon for a file is clicked.
   */
  deleteFile(fileId: string): void {
    if (!fileId) return;
    this.fileIdToDelete = fileId;
    this.showDeleteConfirmModal = true;
  }

  /**
   * Performs the actual deletion via the service after user confirms in the modal.
   */
  confirmDelete(): void {
    const courseId = this.uploadForm.get('courseId')?.value;
    const topicId = this.uploadForm.get('topicId')?.value;
    const lectureId = this.uploadForm.get('lectureId')?.value;

    if (this.videoIdToDelete) {
      this.uploadVideoService.deleteVideo(this.videoIdToDelete).subscribe({
        next: () => {
          if (courseId) this.loadExistingCourseVideos(courseId);
          if (courseId && topicId) this.loadExistingVideos(courseId, topicId);
          if (courseId && topicId && lectureId) this.loadExistingLectureVideos(courseId, topicId, lectureId);
          this.closeDeleteConfirmModal();
        },
        error: (err) => {
          this.errorMessage = 'Failed to delete video.';
          this.closeDeleteConfirmModal();
        }
      });
    } else if (this.fileIdToDelete) {
      this.uploadFileService.deleteFile(this.fileIdToDelete).subscribe({
        next: () => {
          if (courseId) this.loadExistingCourseFiles(courseId);
          if (courseId && topicId) this.loadExistingTopicFiles(courseId, topicId);
          if (courseId && topicId && lectureId) this.loadExistingLectureFiles(courseId, topicId, lectureId);
          this.closeDeleteConfirmModal();
        },
        error: (err) => {
          this.errorMessage = 'Failed to delete file.';
          this.closeDeleteConfirmModal();
        }
      });
    }
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.videoIdToDelete = null;
    this.fileIdToDelete = null;
  }

  /**
   * Opens the video player modal and sets the safe URL.
   */
  openVideoModal(item: any): void {
    this.currentVideoTitle = item.title || 'Preview';
    const rawUrl = item.videoPath || item.filePath;
    this.currentRawUrl = rawUrl;

    // Reset flags
    this.isYouTube = false;
    this.isVideo = false;
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
    } else if (this.isVideoFile(rawUrl)) {
      this.isVideo = true;
      this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
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
   * Clears the video data to stop playback.
   */
  closeVideoModal(): void {
    this.currentVideoUrl = null;
    this.currentVideoTitle = '';
    this.isYouTube = false;
    this.isVideo = false;
    this.isImage = false;
    this.isPdf = false;
    this.isOfficeDoc = false;
    this.currentRawUrl = '';
  }

  private isVideoFile(path: string): boolean {
    return /\.(mp4|webm|ogg|m4v|mov)$/i.test(path);
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

  downloadFile(item: any): void {
    const url = item.videoPath || item.filePath || this.currentRawUrl;
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
   * Validates based on the current uploadType.
   */
  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;
    const uploadType = this.uploadForm.get('uploadType')?.value;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      
      // If "Video File" is selected, enforce video types.
      // If "Upload File" (filePath) is selected, allow any.
      if (uploadType === 'filePath' || file.type.startsWith('video/')) {
        this.selectedFile = file;
        this.errorMessage = null;
      } else {
        this.selectedFile = null;
        this.errorMessage = 'Please select a valid file format.';
        element.value = ''; // Reset the input
      }
    }
  }

  /**
   * Submits the form data and the video file to the server.
   * Uses FormData to package the file and metadata.
   */
  onSubmit(): void {
    const uploadType = this.uploadForm.get('uploadType')?.value;
    const isFileMode = uploadType === 'file' || uploadType === 'filePath';

    if (this.uploadForm.invalid || (isFileMode && !this.selectedFile)) {
      this.uploadForm.markAllAsTouched();
      if (isFileMode && !this.selectedFile) {
        this.errorMessage = `Please select a ${uploadType === 'file' ? 'video' : 'file'} to upload.`;
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
      [uploadType === 'filePath' ? 'file' : 'video']: this.selectedFile,
      ...formValues,
      topic: selectedTopic?.title || '',
      lecture: selectedLecture?.lecture || ''
    };

    const uploadObs = uploadType === 'filePath' 
      ? this.uploadFileService.uploadFile(payload) 
      : this.uploadVideoService.uploadVideo(payload);

    uploadObs
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