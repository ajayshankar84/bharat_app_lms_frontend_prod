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
import {
  CourseContentService,
  CourseContent,
} from '../../core/services/course-content.service';
import { AuthService } from '../../core/services/auth.service';

interface MediaState {
  file: File | null;
  preview: string;
  uploadedUrl: string;
  isUploading: boolean;
  uploadError: string;
  isUploaded: boolean;
}

function createMediaState(uploadedUrl: string = ''): MediaState {
  return {
    file: null,
    preview: uploadedUrl,
    uploadedUrl,
    isUploading: false,
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

  get whatYouLearn(): string[] {
    return this.courseForm.get('whatYouLearn')?.value || [];
  }

  get specializations(): string[] {
    return this.courseForm.get('instructorSpecializations')?.value || [];
  }

  get isFormValid(): boolean {
    return this.courseForm.valid && this.thumbnailMedia.uploadedUrl !== '';
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
      description: ['', [Validators.required, Validators.minLength(20)]],
      category: ['', [Validators.required]],
      subcategory: [''],
      level: ['', [Validators.required]],
      language: ['', [Validators.required]],
      type: ['paid', [Validators.required]],
      isFree: [false],
      price: [0, [Validators.min(0)]],
      originalPrice: [0, [Validators.min(0)]],
      discount: [0, [Validators.min(0), Validators.max(100)]],
      duration: ['', [Validators.required]],
      totalLessons: [0, [Validators.min(0)]],
      instructorId: [user?._id || ''],
      instructorName: [user?.name || '', [Validators.required]],
      instructorBio: [user?.bio || ''],
      instructorAvatar: [user?.profileImage || ''],
      instructorSpecializations: [[]],
      tags: [[]],
      requirements: [[]],
      whatYouLearn: [[]],
      previewVideoUrl: [''],
      previewDuration: [''],
      certificate: [true],
      hasLiveClasses: [false],
      lessons: this.fb.array([]),
    });
  }

  private loadCourse(id: string): void {
    this.isLoadingCourse = true;
    this.errorMessage = '';

    this.courseContentService.getCourseById(id).subscribe({
      next: (res) => {
        if (res?.success && res?.data) {
          this.populateForm(res.data);
        } else {
          this.errorMessage = 'Failed to load course data.';
        }
        this.isLoadingCourse = false;
      },
      error: (err) => {
        console.error('Error loading course:', err);
        this.errorMessage = err?.error?.message || 'Failed to load course.';
        this.isLoadingCourse = false;
      },
    });
  }

  private populateForm(course: CourseContent): void {
    const isFree = course.type === 'free' || course.price === 0;
    this.isFreeMode = isFree;

    this.courseForm.patchValue(
      {
        title: course.title || '',
        description: course.description || '',
        category: course.category || '',
        subcategory: course.subcategory || '',
        level: course.level || '',
        language: course.language || '',
        type: course.type || 'paid',
        isFree: isFree,
        price: course.price || 0,
        originalPrice: course.originalPrice || 0,
        discount: course.discount || 0,
        duration: course.duration || '',
        totalLessons: course.totalLessons || 0,
        instructorId: course.instructor?._id || '',
        instructorName: course.instructor?.name || '',
        instructorBio: course.instructor?.bio || '',
        instructorAvatar: course.instructor?.avatar || '',
        instructorSpecializations: course.instructor?.specializations || [],
        tags: course.tags || [],
        requirements: course.requirements || [],
        whatYouLearn: course.whatYouLearn || [],
        previewVideoUrl: course.preview?.videoUrl || '',
        previewDuration: course.preview?.duration || '',
        certificate: course.certificate ?? true,
        hasLiveClasses: course.hasLiveClasses ?? false,
      },
      { emitEvent: false },
    );

    this.thumbnailMedia = createMediaState(course.image || '');
    this.previewMedia = createMediaState(course.preview?.videoUrl || '');

    if (isFree) {
      this.courseForm.get('price')?.disable({ emitEvent: false });
      this.courseForm.get('originalPrice')?.disable({ emitEvent: false });
      this.courseForm.get('discount')?.disable({ emitEvent: false });
    }

    if (this.lessons.length === 0) {
      this.addLesson();
    }
  }

  private watchPricing(): void {
    this.courseForm
      .get('isFree')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((isFree: boolean) => {
        this.isFreeMode = isFree;
        if (isFree) {
          this.courseForm.patchValue(
            { price: 0, originalPrice: 0, discount: 0, type: 'free' },
            { emitEvent: false },
          );
          this.courseForm.get('price')?.disable({ emitEvent: false });
          this.courseForm.get('originalPrice')?.disable({ emitEvent: false });
          this.courseForm.get('discount')?.disable({ emitEvent: false });
        } else {
          this.courseForm.patchValue({ type: 'paid' }, { emitEvent: false });
          this.courseForm.get('price')?.enable({ emitEvent: false });
          this.courseForm.get('originalPrice')?.enable({ emitEvent: false });
          this.courseForm.get('discount')?.enable({ emitEvent: false });
        }
      });

    this.courseForm
      .get('originalPrice')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalculateDiscount());

    this.courseForm
      .get('price')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalculateDiscount());
  }

  private recalculateDiscount(): void {
    const original = Number(this.courseForm.get('originalPrice')?.value || 0);
    const current = Number(this.courseForm.get('price')?.value || 0);

    if (original > 0 && current >= 0 && current <= original) {
      const discount = Math.round(((original - current) / original) * 100);
      this.courseForm.get('discount')?.setValue(discount, { emitEvent: false });
    } else {
      this.courseForm.get('discount')?.setValue(0, { emitEvent: false });
    }
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

  onThumbnailSelected(event: Event): void {
    const file = this.extractFile(event, 'image');
    if (!file) return;
    this.thumbnailMedia.file = file;
    this.thumbnailMedia.preview = URL.createObjectURL(file);
    this.thumbnailMedia.uploadedUrl = '';
    this.thumbnailMedia.isUploaded = false;
  }

  async uploadThumbnail(): Promise<void> {
    if (!this.thumbnailMedia.file) return;
    this.thumbnailMedia.isUploading = true;
    this.thumbnailMedia.uploadError = '';
    try {
      const res = await lastValueFrom(
        this.courseContentService.uploadMedia(this.thumbnailMedia.file),
      );
      this.thumbnailMedia.uploadedUrl =
        res?.url || res?.data?.url || res?.data?.fileId || '';
      this.thumbnailMedia.isUploaded = true;
    } catch {
      this.thumbnailMedia.uploadError = 'Upload failed. Please try again.';
    } finally {
      this.thumbnailMedia.isUploading = false;
    }
  }

  onPreviewSelected(event: Event): void {
    const file = this.extractFile(event, 'video');
    if (!file) return;
    this.previewMedia.file = file;
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
      this.previewMedia.uploadedUrl =
        res?.url || res?.data?.url || res?.data?.fileId || '';
      this.previewMedia.isUploaded = true;
      this.courseForm
        .get('previewVideoUrl')
        ?.setValue(this.previewMedia.uploadedUrl);
    } catch {
      this.previewMedia.uploadError = 'Upload failed. Please try again.';
    } finally {
      this.previewMedia.isUploading = false;
    }
  }

  onLessonVideoSelected(event: Event, index: number): void {
    const file = this.extractFile(event, 'video');
    if (!file) return;
    this.lessonMediaStates[index].file = file;
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
      state.uploadedUrl = res?.url || res?.data?.url || res?.data?.fileId || '';
      state.isUploaded = true;
      this.getLessonControl(index, 'videoUrl').setValue(state.uploadedUrl);
      this.recalculateTotals();
    } catch {
      state.uploadError = 'Upload failed. Please try again.';
    } finally {
      state.isUploading = false;
    }
  }

  onLessonThumbnailSelected(event: Event, index: number): void {
    const file = this.extractFile(event, 'image');
    if (!file) return;
    this.lessonThumbnailMediaStates[index].file = file;
    this.lessonThumbnailMediaStates[index].preview = URL.createObjectURL(file);
    this.lessonThumbnailMediaStates[index].uploadedUrl = '';
    this.lessonThumbnailMediaStates[index].isUploaded = false;
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
      state.uploadedUrl = res?.url || res?.data?.url || res?.data?.fileId || '';
      state.isUploaded = true;
      this.getLessonControl(index, 'thumbnail').setValue(state.uploadedUrl);
    } catch {
      state.uploadError = 'Upload failed. Please try again.';
    } finally {
      state.isUploading = false;
    }
  }

  private extractFile(event: Event, type: 'image' | 'video'): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return null;
    const isValid =
      type === 'image'
        ? file.type.startsWith('image/')
        : file.type.startsWith('video/');
    if (!isValid) return null;
    return file;
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
    this.courseForm.patchValue(
      {
        totalLessons: this.lessons.length,
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
    this.addToListField('whatYouLearn', 'learnInput');
  }
  removeLearnItem(i: number): void {
    this.removeFromListField('whatYouLearn', i);
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
      this.errorMessage = err?.error?.message || 'Failed to delete course.';
    } finally {
      this.isDeleting = false;
    }
  }

  async onConfirmSubmit(): Promise<void> {
    this.showConfirmDialog = false;
    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const formValue = this.courseForm.getRawValue();
      const user = this.authService.currentUser;

      const payload = {
        title: formValue.title,
        description: formValue.description,
        instructor: {
          _id: formValue.instructorId || user?._id || '',
          name: formValue.instructorName || user?.name || '',
          bio: formValue.instructorBio || '',
          avatar: formValue.instructorAvatar || '',
          specializations: formValue.instructorSpecializations || [],
        },
        category: formValue.category,
        subcategory: formValue.subcategory || '',
        level: formValue.level,
        language: formValue.language,
        type: formValue.isFree ? 'free' : 'paid',
        price: formValue.isFree ? 0 : Number(formValue.price || 0),
        originalPrice: formValue.isFree
          ? 0
          : Number(formValue.originalPrice || 0),
        discount: formValue.isFree ? 0 : Number(formValue.discount || 0),
        duration: formValue.duration,
        totalLessons:
          this.lessons.length || Number(formValue.totalLessons || 0),
        image: this.thumbnailMedia.uploadedUrl,
        preview: {
          videoUrl:
            this.previewMedia.uploadedUrl || formValue.previewVideoUrl || '',
          duration: formValue.previewDuration || '',
        },
        tags: formValue.tags || [],
        certificate: formValue.certificate,
        hasLiveClasses: formValue.hasLiveClasses,
        whatYouLearn: formValue.whatYouLearn || [],
        requirements: formValue.requirements || [],
      };

      if (this.isEditMode && this.courseId) {
        await lastValueFrom(
          this.courseContentService.updateCourseContent(this.courseId, payload),
        );
      } else {
        await lastValueFrom(
          this.courseContentService.createCourseContent(payload),
        );
      }

      this.createdCourseName = formValue.title;
      this.showSuccessDialog = true;
    } catch (err: any) {
      this.errorMessage =
        err?.error?.message || 'Failed to save course. Please try again.';
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

  getDiscountPercent(): number {
    const original = Number(this.courseForm.get('originalPrice')?.value || 0);
    const current = Number(this.courseForm.get('price')?.value || 0);
    if (original <= 0) return 0;
    return Math.round(((original - current) / original) * 100);
  }
}
