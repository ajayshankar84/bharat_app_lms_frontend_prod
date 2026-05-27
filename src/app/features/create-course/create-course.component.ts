import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CourseContentService } from '../../core/services/course-content.service';
import { AuthService } from '../../core/services/auth.service';
import {
  compressImage,
  validateImageFile,
  validateVideoFile,
  formatFileSize,
  MAX_IMAGE_SIZE_MB,
  MAX_VIDEO_SIZE_MB,
} from '../../core/utils/media.utils';

interface MediaState {
  file: File | null;
  preview: string;
  uploadedUrl: string;
  isUploading: boolean;
  isProcessing: boolean;
  uploadError: string;
  isUploaded: boolean;
  originalSize?: number;
  finalSize?: number;
}

function createMediaState(uploadedUrl: string = ''): MediaState {
  return {
    file: null,
    preview: uploadedUrl,
    uploadedUrl,
    isUploading: false,
    isProcessing: false,
    uploadError: '',
    isUploaded: !!uploadedUrl,
  };
}

@Component({
  selector: 'app-create-course',
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class CreateCourseComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseContentService = inject(CourseContentService);
  private authService = inject(AuthService);

  courseForm!: FormGroup;
  courseId: string | null = null;
  isEditMode = false;
  isLoadingCourse = false;

  thumbnailMedia: MediaState = createMediaState();
  previewMedia: MediaState = createMediaState();
  lessonMediaStates: MediaState[] = [];
  lessonThumbnailMediaStates: MediaState[] = [];

  isSubmitting = false;
  isDeleting = false;
  showConfirmDialog = false;
  showSuccessDialog = false;
  showDeleteDialog = false;
  createdCourseName = '';
  errorMessage = '';

  isFreeMode = false;

  tagInput = '';
  requirementInput = '';
  learnInput = '';
  specializationInput = '';

  readonly maxVideoSizeMB = MAX_VIDEO_SIZE_MB;
  readonly maxImageSizeMB = MAX_IMAGE_SIZE_MB;

  private destroy$ = new Subject<void>();

  readonly levels = ['Beginner', 'Intermediate', 'Advanced'];
  readonly languages = ['English', 'Hindi', 'Both'];
  readonly categories = [
    'Technology',
    'Web Development',
    'Mobile Development',
    'Backend',
    'Frontend',
    'Full Stack',
    'MEAN Stack',
    'MERN Stack',
    'DevOps',
    'UX/UI',
    'Cyber Security',
    'Internship',
    'Design',
    'Business',
  ];

  get f(): { [key: string]: AbstractControl } {
    return this.courseForm.controls;
  }

  get lessons(): FormArray {
    return this.courseForm.get('lessons') as FormArray;
  }

  get tags(): string[] {
    return this.courseForm.get('tags')?.value || [];
  }

  get requirements(): string[] {
    return this.courseForm.get('requirements')?.value || [];
  }

  get whatYouWillLearn(): string[] {
    return this.courseForm.get('whatYouWillLearn')?.value || [];
  }

  get specializations(): string[] {
    return this.courseForm.get('instructorSpecializations')?.value || [];
  }

  get hasUnuploadedMedia(): boolean {
    if (this.thumbnailMedia.file && !this.thumbnailMedia.isUploaded)
      return true;
    if (this.previewMedia.file && !this.previewMedia.isUploaded) return true;
    for (const state of this.lessonMediaStates) {
      if (state.file && !state.isUploaded) return true;
    }
    for (const state of this.lessonThumbnailMediaStates) {
      if (state.file && !state.isUploaded) return true;
    }
    return false;
  }

  get isAnyUploading(): boolean {
    if (this.thumbnailMedia.isUploading || this.thumbnailMedia.isProcessing)
      return true;
    if (this.previewMedia.isUploading || this.previewMedia.isProcessing)
      return true;
    for (const state of this.lessonMediaStates) {
      if (state.isUploading || state.isProcessing) return true;
    }
    for (const state of this.lessonThumbnailMediaStates) {
      if (state.isUploading || state.isProcessing) return true;
    }
    return false;
  }

  get publishDisabledReason(): string {
    if (this.isSubmitting) return 'Publishing in progress...';
    if (this.isDeleting) return 'Deleting in progress...';
    if (this.isAnyUploading)
      return 'Wait for media to finish processing/uploading';
    if (this.hasUnuploadedMedia) return 'Upload all selected media files first';
    if (!this.thumbnailMedia.uploadedUrl) return 'Course thumbnail is required';
    if (this.courseForm.invalid) return 'Fill all required fields';
    return '';
  }

  get isFormValid(): boolean {
    return (
      this.courseForm.valid &&
      this.thumbnailMedia.uploadedUrl !== '' &&
      !this.hasUnuploadedMedia &&
      !this.isAnyUploading
    );
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Course' : 'Create New Course';
  }

  get pageSubtitle(): string {
    return this.isEditMode
      ? 'Update your course details and content'
      : 'Build and publish your course content';
  }

  get submitButtonLabel(): string {
    if (this.isSubmitting) {
      return this.isEditMode ? 'Updating...' : 'Publishing...';
    }
    return this.isEditMode ? 'Update Course' : 'Publish Course';
  }

  ngOnInit(): void {
    this.initForm();
    this.watchPricing();
    this.watchTitleForSlug();

    this.courseId = this.route.snapshot.queryParamMap.get('course');
    if (this.courseId) {
      this.isEditMode = true;
      this.loadCourse(this.courseId);
    } else {
      this.addLesson();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    const user = this.authService.currentUser;

    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      slug: [{ value: '', disabled: true }],
      shortDescription: ['', [Validators.required, Validators.minLength(10)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      category: ['', [Validators.required]],
      subcategory: [''],
      level: ['', [Validators.required]],
      language: ['', [Validators.required]],
      isFree: [false],
      price: [0, [Validators.min(0)]],
      discountPrice: [0, [Validators.min(0)]],
      duration: [{ value: '', disabled: true }],
      totalDuration: [{ value: '00:00', disabled: true }],
      totalVideos: [{ value: 0, disabled: true }],
      instructorId: [user?._id || ''],
      instructorName: [user?.name || '', [Validators.required]],
      instructorEmail: [user?.email || ''],
      instructorBio: [user?.bio || ''],
      instructorAvatar: [user?.profileImage || ''],
      instructorSpecializations: [[]],
      tags: [[]],
      requirements: [[]],
      whatYouWillLearn: [[]],
      previewVideoUrl: [''],
      previewDuration: [''],
      certificateAvailable: [true],
      isPublished: [true],
      hasLiveClasses: [false],
      lessons: this.fb.array([]),
    });
  }

  private watchTitleForSlug(): void {
    this.courseForm
      .get('title')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((title: string) => {
        if (title) {
          const slug = title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          this.courseForm.get('slug')?.setValue(slug, { emitEvent: false });
        } else {
          this.courseForm.get('slug')?.setValue('', { emitEvent: false });
        }
      });
  }

  private loadCourse(id: string): void {
    this.isLoadingCourse = true;
    this.errorMessage = '';

    this.courseContentService.getCourseById(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (data) {
          this.populateForm(data);
        } else {
          this.errorMessage = 'Failed to load course data.';
        }
        this.isLoadingCourse = false;
      },
      error: (err) => {
        this.errorMessage = this.extractErrorMessage(err);
        this.isLoadingCourse = false;
      },
    });
  }

  private populateForm(course: any): void {
    const isFree = course.type === 'free' || course.price === 0;
    this.isFreeMode = isFree;

    this.courseForm.patchValue(
      {
        title: course.title || '',
        shortDescription: course.shortDescription || '',
        description: course.description || '',
        category: course.category || '',
        subcategory: course.subcategory || '',
        level: course.level || '',
        language: course.language || '',
        isFree: isFree,
        price: course.price || course.originalPrice || 0,
        discountPrice: course.discountPrice || course.price || 0,
        duration: course.duration || course.totalDuration || '',
        totalDuration: course.totalDuration || course.duration || '00:00',
        totalVideos: course.totalVideos || course.totalLessons || 0,
        instructorId: course.instructor?._id || '',
        instructorName: course.instructor?.name || '',
        instructorEmail: course.instructor?.email || '',
        instructorBio: course.instructor?.bio || '',
        instructorAvatar:
          course.instructor?.profileImage || course.instructor?.avatar || '',
        instructorSpecializations: course.instructor?.specializations || [],
        tags: course.tags || [],
        requirements: course.requirements || [],
        whatYouWillLearn: course.whatYouWillLearn || course.whatYouLearn || [],
        previewVideoUrl:
          typeof course.preview === 'string'
            ? course.preview
            : course.preview?.videoUrl || '',
        previewDuration: course.preview?.duration || '',
        certificateAvailable:
          course.certificateAvailable ?? course.certificate ?? true,
        isPublished: course.isPublished ?? true,
        hasLiveClasses: course.hasLiveClasses ?? false,
      },
      { emitEvent: false },
    );

    this.thumbnailMedia = createMediaState(
      course.thumbnail || course.image || '',
    );
    const previewUrl =
      typeof course.preview === 'string'
        ? course.preview
        : course.preview?.videoUrl || '';
    this.previewMedia = createMediaState(previewUrl);

    if (isFree) {
      this.courseForm.get('price')?.disable({ emitEvent: false });
      this.courseForm.get('discountPrice')?.disable({ emitEvent: false });
    }

    const videos = course.videos || course.lessons || [];
    if (Array.isArray(videos) && videos.length > 0) {
      while (this.lessons.length > 0) {
        this.lessons.removeAt(0);
      }
      this.lessonMediaStates = [];
      this.lessonThumbnailMediaStates = [];

      videos.forEach((v: any) => {
        const lessonGroup = this.fb.group({
          name: [v.name || '', [Validators.required]],
          description: [v.description || ''],
          videoUrl: [v.videoUrl || ''],
          thumbnail: [v.thumbnail || ''],
          duration: [v.duration || ''],
        });
        this.lessons.push(lessonGroup);
        this.lessonMediaStates.push(createMediaState(v.videoUrl || ''));
        this.lessonThumbnailMediaStates.push(
          createMediaState(v.thumbnail || ''),
        );
      });
    } else if (this.lessons.length === 0) {
      this.addLesson();
    }

    this.recalculateTotals();
  }

  private watchPricing(): void {
    this.courseForm
      .get('isFree')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((isFree: boolean) => {
        this.isFreeMode = isFree;
        if (isFree) {
          this.courseForm.patchValue(
            { price: 0, discountPrice: 0 },
            { emitEvent: false },
          );
          this.courseForm.get('price')?.disable({ emitEvent: false });
          this.courseForm.get('discountPrice')?.disable({ emitEvent: false });
        } else {
          this.courseForm.get('price')?.enable({ emitEvent: false });
          this.courseForm.get('discountPrice')?.enable({ emitEvent: false });
        }
      });

    this.courseForm
      .get('price')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((price: number) => {
        const currentDiscount =
          this.courseForm.get('discountPrice')?.value || 0;
        if (currentDiscount === 0 && price > 0) {
          this.courseForm
            .get('discountPrice')
            ?.setValue(price, { emitEvent: false });
        }
        if (currentDiscount > price && price > 0) {
          this.courseForm
            .get('discountPrice')
            ?.setValue(price, { emitEvent: false });
        }
      });

    this.courseForm
      .get('discountPrice')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((discountPrice: number) => {
        const price = this.courseForm.get('price')?.value || 0;
        if (discountPrice > price && price > 0) {
          this.courseForm
            .get('discountPrice')
            ?.setValue(price, { emitEvent: false });
        }
      });
  }

  getDiscountPercent(): number {
    const price = Number(this.courseForm.get('price')?.value || 0);
    const discountPrice = Number(
      this.courseForm.get('discountPrice')?.value || 0,
    );
    if (price <= 0 || discountPrice >= price) return 0;
    return Math.round(((price - discountPrice) / price) * 100);
  }

  addLesson(): void {
    const lessonGroup = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      videoUrl: [''],
      thumbnail: [''],
      duration: [''],
    });

    this.lessons.push(lessonGroup);
    this.lessonMediaStates.push(createMediaState());
    this.lessonThumbnailMediaStates.push(createMediaState());
    this.recalculateTotals();
  }

  removeLesson(index: number): void {
    if (this.lessons.length <= 1) return;
    this.lessons.removeAt(index);
    this.lessonMediaStates.splice(index, 1);
    this.lessonThumbnailMediaStates.splice(index, 1);
    this.recalculateTotals();
  }

  getLessonControl(index: number, field: string): AbstractControl {
    return this.lessons.at(index).get(field)!;
  }

  isLessonFieldInvalid(index: number, field: string): boolean {
    const ctrl = this.getLessonControl(index, field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  formatSize(bytes: number | undefined): string {
    if (!bytes) return '';
    return formatFileSize(bytes);
  }

  private extractRawFile(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    return file || null;
  }

  private extractFileIdFromResponse(res: any): string {
    if (res?.files && Array.isArray(res.files) && res.files.length > 0) {
      return res.files[0].fileId || res.files[0]._id || res.files[0].id || '';
    }
    return res?.fileId || res?.data?.fileId || res?.url || res?.data?.url || '';
  }

  private extractErrorMessage(err: any): string {
    if (err?.error?.message) return err.error.message;
    if (err?.error?.error) return err.error.error;
    if (typeof err?.error === 'string') return err.error;
    if (err?.message) return err.message;
    if (err?.status === 413) return 'File is too large for the server.';
    if (err?.status === 401) return 'Session expired. Please login again.';
    if (err?.status === 0) return 'Network error. Check your connection.';
    return 'Operation failed. Please try again.';
  }

  async onThumbnailSelected(event: Event): Promise<void> {
    const file = this.extractRawFile(event);
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      this.thumbnailMedia.uploadError = validation.error || '';
      return;
    }

    this.thumbnailMedia.uploadError = '';
    this.thumbnailMedia.isProcessing = true;
    this.thumbnailMedia.originalSize = file.size;
    this.thumbnailMedia.uploadedUrl = '';
    this.thumbnailMedia.isUploaded = false;

    try {
      const compressed = await compressImage(file);
      this.thumbnailMedia.file = compressed;
      this.thumbnailMedia.finalSize = compressed.size;
      this.thumbnailMedia.preview = URL.createObjectURL(compressed);
    } catch {
      this.thumbnailMedia.uploadError = 'Failed to process image.';
    } finally {
      this.thumbnailMedia.isProcessing = false;
    }
  }

  async uploadThumbnail(): Promise<void> {
    if (!this.thumbnailMedia.file) return;
    this.thumbnailMedia.isUploading = true;
    this.thumbnailMedia.uploadError = '';
    try {
      const res = await lastValueFrom(
        this.courseContentService.uploadMedia(this.thumbnailMedia.file),
      );
      const fileId = this.extractFileIdFromResponse(res);
      if (!fileId) {
        this.thumbnailMedia.uploadError =
          'Upload succeeded but no file ID returned.';
      } else {
        this.thumbnailMedia.uploadedUrl = fileId;
        this.thumbnailMedia.isUploaded = true;
      }
    } catch (err: any) {
      this.thumbnailMedia.uploadError = this.extractErrorMessage(err);
    } finally {
      this.thumbnailMedia.isUploading = false;
    }
  }

  onPreviewSelected(event: Event): void {
    const file = this.extractRawFile(event);
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      this.previewMedia.uploadError = validation.error || '';
      return;
    }

    this.previewMedia.uploadError = '';
    this.previewMedia.file = file;
    this.previewMedia.originalSize = file.size;
    this.previewMedia.finalSize = file.size;
    this.previewMedia.preview = URL.createObjectURL(file);
    this.previewMedia.uploadedUrl = '';
    this.previewMedia.isUploaded = false;
    this.extractPreviewDuration(file);
  }

  private extractPreviewDuration(file: File): void {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const total = Math.floor(video.duration);
      const m = Math.floor(total / 60)
        .toString()
        .padStart(2, '0');
      const s = (total % 60).toString().padStart(2, '0');
      this.courseForm.get('previewDuration')?.setValue(`${m}:${s}`);
    };
  }

  async uploadPreview(): Promise<void> {
    if (!this.previewMedia.file) return;
    this.previewMedia.isUploading = true;
    this.previewMedia.uploadError = '';
    try {
      const res = await lastValueFrom(
        this.courseContentService.uploadMedia(this.previewMedia.file),
      );
      const fileId = this.extractFileIdFromResponse(res);
      if (!fileId) {
        this.previewMedia.uploadError =
          'Upload succeeded but no file ID returned.';
      } else {
        this.previewMedia.uploadedUrl = fileId;
        this.previewMedia.isUploaded = true;
        this.courseForm.get('previewVideoUrl')?.setValue(fileId);
      }
    } catch (err: any) {
      this.previewMedia.uploadError = this.extractErrorMessage(err);
    } finally {
      this.previewMedia.isUploading = false;
    }
  }

  onLessonVideoSelected(event: Event, index: number): void {
    const file = this.extractRawFile(event);
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      this.lessonMediaStates[index].uploadError = validation.error || '';
      return;
    }

    this.lessonMediaStates[index].uploadError = '';
    this.lessonMediaStates[index].file = file;
    this.lessonMediaStates[index].originalSize = file.size;
    this.lessonMediaStates[index].finalSize = file.size;
    this.lessonMediaStates[index].preview = URL.createObjectURL(file);
    this.lessonMediaStates[index].uploadedUrl = '';
    this.lessonMediaStates[index].isUploaded = false;
    this.extractVideoDuration(file, index);
  }

  async uploadLessonVideo(index: number): Promise<void> {
    const state = this.lessonMediaStates[index];
    if (!state.file) return;
    state.isUploading = true;
    state.uploadError = '';
    try {
      const res = await lastValueFrom(
        this.courseContentService.uploadMedia(state.file),
      );
      const fileId = this.extractFileIdFromResponse(res);
      if (!fileId) {
        state.uploadError = 'Upload succeeded but no file ID returned.';
      } else {
        state.uploadedUrl = fileId;
        state.isUploaded = true;
        this.getLessonControl(index, 'videoUrl').setValue(fileId);
        this.recalculateTotals();
      }
    } catch (err: any) {
      state.uploadError = this.extractErrorMessage(err);
    } finally {
      state.isUploading = false;
    }
  }

  async onLessonThumbnailSelected(event: Event, index: number): Promise<void> {
    const file = this.extractRawFile(event);
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      this.lessonThumbnailMediaStates[index].uploadError =
        validation.error || '';
      return;
    }

    this.lessonThumbnailMediaStates[index].uploadError = '';
    this.lessonThumbnailMediaStates[index].isProcessing = true;
    this.lessonThumbnailMediaStates[index].originalSize = file.size;
    this.lessonThumbnailMediaStates[index].uploadedUrl = '';
    this.lessonThumbnailMediaStates[index].isUploaded = false;

    try {
      const compressed = await compressImage(file);
      this.lessonThumbnailMediaStates[index].file = compressed;
      this.lessonThumbnailMediaStates[index].finalSize = compressed.size;
      this.lessonThumbnailMediaStates[index].preview =
        URL.createObjectURL(compressed);
    } catch {
      this.lessonThumbnailMediaStates[index].uploadError =
        'Failed to process image.';
    } finally {
      this.lessonThumbnailMediaStates[index].isProcessing = false;
    }
  }

  async uploadLessonThumbnail(index: number): Promise<void> {
    const state = this.lessonThumbnailMediaStates[index];
    if (!state.file) return;
    state.isUploading = true;
    state.uploadError = '';
    try {
      const res = await lastValueFrom(
        this.courseContentService.uploadMedia(state.file),
      );
      const fileId = this.extractFileIdFromResponse(res);
      if (!fileId) {
        state.uploadError = 'Upload succeeded but no file ID returned.';
      } else {
        state.uploadedUrl = fileId;
        state.isUploaded = true;
        this.getLessonControl(index, 'thumbnail').setValue(fileId);
      }
    } catch (err: any) {
      state.uploadError = this.extractErrorMessage(err);
    } finally {
      state.isUploading = false;
    }
  }

  private extractVideoDuration(file: File, lessonIndex: number): void {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const total = Math.floor(video.duration);
      const m = Math.floor(total / 60)
        .toString()
        .padStart(2, '0');
      const s = (total % 60).toString().padStart(2, '0');
      this.getLessonControl(lessonIndex, 'duration').setValue(`${m}:${s}`);
      this.recalculateTotals();
    };
  }

  private recalculateTotals(): void {
    let totalSeconds = 0;
    for (const lesson of this.lessons.controls) {
      const dur = lesson.get('duration')?.value || '00:00';
      const parts = String(dur).split(':');
      const mins = parseInt(parts[0] || '0', 10) || 0;
      const secs = parseInt(parts[1] || '0', 10) || 0;
      totalSeconds += mins * 60 + secs;
    }

    const totalMins = Math.floor(totalSeconds / 60);
    const remSeconds = totalSeconds % 60;
    const totalDurationStr = `${totalMins.toString().padStart(2, '0')}:${remSeconds.toString().padStart(2, '0')}`;

    const totalHours = Math.floor(totalSeconds / 3600);
    const displayMinutes = Math.floor((totalSeconds % 3600) / 60);
    let displayDuration = '';
    if (totalHours > 0) {
      displayDuration = `${totalHours}h ${displayMinutes}m`;
    } else if (displayMinutes > 0) {
      displayDuration = `${displayMinutes}m ${remSeconds}s`;
    } else {
      displayDuration = `${remSeconds}s`;
    }

    this.courseForm.patchValue(
      {
        totalVideos: this.lessons.length,
        duration: displayDuration,
        totalDuration: totalDurationStr,
      },
      { emitEvent: false },
    );
  }

  addTag(): void {
    this.addToListField('tags', 'tagInput');
  }
  removeTag(i: number): void {
    this.removeFromListField('tags', i);
  }

  addRequirement(): void {
    this.addToListField('requirements', 'requirementInput');
  }
  removeRequirement(i: number): void {
    this.removeFromListField('requirements', i);
  }

  addLearnItem(): void {
    this.addToListField('whatYouWillLearn', 'learnInput');
  }
  removeLearnItem(i: number): void {
    this.removeFromListField('whatYouWillLearn', i);
  }

  addSpecialization(): void {
    this.addToListField('instructorSpecializations', 'specializationInput');
  }
  removeSpecialization(i: number): void {
    this.removeFromListField('instructorSpecializations', i);
  }

  private addToListField(field: string, inputProp: string): void {
    const value = (this as any)[inputProp]?.trim();
    if (!value) return;
    const current: string[] = this.courseForm.get(field)?.value || [];
    if (!current.includes(value)) {
      this.courseForm.get(field)?.setValue([...current, value]);
    }
    (this as any)[inputProp] = '';
  }

  private removeFromListField(field: string, index: number): void {
    const current: string[] = this.courseForm.get(field)?.value || [];
    current.splice(index, 1);
    this.courseForm.get(field)?.setValue([...current]);
  }

  onTagKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addTag();
    }
  }
  onRequirementKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addRequirement();
    }
  }
  onLearnKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addLearnItem();
    }
  }
  onSpecKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addSpecialization();
    }
  }

  openConfirmDialog(): void {
    if (!this.isFormValid) {
      this.courseForm.markAllAsTouched();
      this.lessons.controls.forEach((c) => (c as FormGroup).markAllAsTouched());
      this.errorMessage =
        this.publishDisabledReason ||
        'Please fill all required fields and upload the course thumbnail.';
      return;
    }
    this.errorMessage = '';
    this.showConfirmDialog = true;
  }

  closeConfirmDialog(): void {
    this.showConfirmDialog = false;
  }

  openDeleteDialog(): void {
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
  }

  async confirmDelete(): Promise<void> {
    if (!this.courseId) return;
    this.showDeleteDialog = false;
    this.isDeleting = true;
    this.errorMessage = '';

    try {
      await lastValueFrom(
        this.courseContentService.deleteCourseContent(this.courseId),
      );
      this.router.navigate(['/dashboard/courses']);
    } catch (err: any) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isDeleting = false;
    }
  }

private buildPayload(): any {
  const formValue = this.courseForm.getRawValue();
  const user = this.authService.currentUser;

  const videos = this.lessons.controls.map((lesson, idx) => ({
    videoUrl: this.lessonMediaStates[idx]?.uploadedUrl || lesson.get('videoUrl')?.value || '',
    name: lesson.get('name')?.value || '',
    duration: lesson.get('duration')?.value || '00:00',
    thumbnail: this.lessonThumbnailMediaStates[idx]?.uploadedUrl || lesson.get('thumbnail')?.value || '',
    description: lesson.get('description')?.value || '',
  }));

  const payload: any = {
    title: formValue.title,
    description: formValue.description,
    instructor: {
      _id: formValue.instructorId || user?._id || '',
      name: formValue.instructorName || user?.name || '',
      bio: formValue.instructorBio || '',
      avatar: formValue.instructorAvatar || user?.profileImage || '',
      specializations: formValue.instructorSpecializations || [],
    },
    category: formValue.category,
    level: formValue.level,
    language: formValue.language,
    type: formValue.isFree ? 'free' : 'paid',
    price: formValue.isFree ? 0 : Number(formValue.discountPrice || formValue.price || 0),
    originalPrice: formValue.isFree ? 0 : Number(formValue.price || 0),
    discount: formValue.isFree ? 0 : this.getDiscountPercent(),
    duration: formValue.totalDuration || '00:00',
    totalLessons: this.lessons.length,
    image: this.thumbnailMedia.uploadedUrl,
    tags: formValue.tags || [],
    certificate: formValue.certificateAvailable,
    hasLiveClasses: formValue.hasLiveClasses || false,
    whatYouLearn: formValue.whatYouWillLearn || [],
    requirements: formValue.requirements || [],
    videos: videos,
  };

  if (formValue.subcategory) {
    payload.subcategory = formValue.subcategory;
  }

  const previewUrl = this.previewMedia.uploadedUrl || formValue.previewVideoUrl || '';
  if (previewUrl) {
    payload.preview = {
      videoUrl: previewUrl,
      duration: formValue.previewDuration || '',
    };
  }

  return payload;
}

  async onConfirmSubmit(): Promise<void> {
    this.showConfirmDialog = false;
    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const payload = this.buildPayload();

      if (this.isEditMode && this.courseId) {
        await lastValueFrom(
          this.courseContentService.updateCourseContent(this.courseId, payload),
        );
      } else {
        await lastValueFrom(
          this.courseContentService.createCourseContent(payload),
        );
      }

      this.createdCourseName = payload.title;
      this.showSuccessDialog = true;
    } catch (err: any) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isSubmitting = false;
    }
  }

  closeSuccessDialog(): void {
    this.showSuccessDialog = false;
    this.router.navigate(['/dashboard/courses']);
  }

  onCancel(): void {
    this.router.navigate(['/dashboard/courses']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.courseForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }
}
