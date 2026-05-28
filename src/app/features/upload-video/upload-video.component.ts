import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CourseService } from '../../core/services/course.service';
import { CourseDetailService } from '../../core/services/course-detail.service';
import { UploadVideoService } from '../../core/services/upload-video.service';

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
  existingVideoPaths: string[] = [];
  selectedFile: File | null = null;
  uploadProgress = 0;
  isSubmitting = false;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private courseDetailService: CourseDetailService,
    private uploadVideoService: UploadVideoService,
    private router: Router
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
      videoPath: ['']
    });
  }

  private setupFormListeners(): void {
    // Reactively load topics when a course is selected
    this.uploadForm.get('courseId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(courseId => {
        if (courseId) {
          this.loadTopics(courseId);
          this.loadExistingVideos(courseId);
        } else {
          this.topics = [];
          this.existingVideoPaths = [];
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
        } else {
          this.lectures = [];
          this.uploadForm.get('lectureId')?.reset('');
        }
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
   * Fetches existing video paths for the selected course and stores them in an array.
   */
  private async loadExistingVideos(courseId: string) {
    try {
      // This assumes UploadVideoService has a getVideosByCourseId method 
      // that calls GET UPLOAD_VIDEO_ENDPOINT/:courseId
      const data: any = await lastValueFrom(this.uploadVideoService.getVideosByCourseId(courseId));
      this.existingVideoPaths = Array.isArray(data) ? data.map((item: any) => item.videoPath).filter(Boolean) : [];
    } catch (error) {
      console.error('Error loading existing videos', error);
      this.existingVideoPaths = [];
    }
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
    if (this.uploadForm.invalid || !this.selectedFile) {
      this.uploadForm.markAllAsTouched();
      if (!this.selectedFile) {
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