import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CourseService } from '../../core/services/course.service';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-course',
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImagePathPipe],
})
export class CreateCourseComponent implements OnInit, OnDestroy {
  courseForm!: FormGroup;
  isEditMode: boolean = false;
  courseId: string | null = null;
  isLoading: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private courseService: CourseService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.courseId = this.route.snapshot.queryParamMap.get('course');
    if (this.courseId) {
      this.isEditMode = true;
      this.loadCourseData(this.courseId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.courseForm = this.fb.group({
      name: ['', [Validators.required]],
      type: ['', [Validators.required]],
      category: ['', [Validators.required]],
      description: ['', [Validators.required]],
      tag: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      discountType: ['Percentage'],
      discount: [0, [Validators.min(0)]],
      finalPrice: [0, [Validators.min(0)]],
      rating: [0, [Validators.min(0), Validators.max(5)]],
      imagePath: [''],
      active: [true],
    });

    this.courseForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateFinalPrice());
  }

  calculateFinalPrice(): void {
    const price = this.courseForm.get('price')?.value || 0;
    const discountType = this.courseForm.get('discountType')?.value;
    const discount = this.courseForm.get('discount')?.value || 0;

    let finalPrice = price;
    if (discountType === 'Percentage') {
      finalPrice = price - (price * discount) / 100;
    } else if (discountType === 'Fixed') {
      finalPrice = price - discount;
    }
    finalPrice = Math.max(0, finalPrice);

    if (this.courseForm.get('finalPrice')?.value !== finalPrice) {
      this.courseForm
        .get('finalPrice')
        ?.setValue(finalPrice, { emitEvent: false });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => (this.imagePreview = reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  loadCourseData(id: string): void {
    this.isLoading = true;
    this.courseService
      .getCourseById(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false)),
      )
      .subscribe({
        next: (course) => {
          this.courseForm.patchValue(course);
          this.imagePreview = course.imagePath || null;
        },
        error: (err) => console.error('Error fetching course:', err),
      });
  }

  async onSubmit(): Promise<void> {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const currentId = this.courseId;

    try {
      const formData = new FormData();
      const formValue = this.courseForm.value;

      Object.entries(formValue).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      if (this.selectedFile) {
        formData.append('image', this.selectedFile);
      }

      if (this.isEditMode && currentId) {
        await lastValueFrom(
          this.courseService.updateCourse(currentId, formData),
        );
      } else {
        await lastValueFrom(this.courseService.createCourse(formData));
      }
      this.router.navigate(['/dashboard/courses']);
    } catch (err) {
      console.error('Error saving course:', err);
    } finally {
      this.isLoading = false;
    }
  }

  onDelete(): void {
    if (
      this.isEditMode &&
      this.courseId &&
      confirm('Are you sure you want to delete this course?')
    ) {
      this.isLoading = true;
      this.courseService
        .deleteCourse(this.courseId)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false)),
        )
        .subscribe({
          next: () => {
            this.router.navigate(['/dashboard/courses']);
          },
          error: (err: any) => console.error('Error deleting course:', err),
        });
    }
  }
}
