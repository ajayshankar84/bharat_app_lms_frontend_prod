import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternshipService } from '../../core/services/internship-.service';
import { Router } from '@angular/router';
import { AssignedCoursePayload, AssignedCourseService } from '../../core/services/assigned-course.service';
import { catchError, forkJoin, map, of } from 'rxjs';
@Component({
    selector: 'app-assigned-course',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './assigned-course.component.html',
    styleUrls: ['./assigned-course.component.scss'],
})
export class AssignedCourseComponent {
    internships: any[] = [];
    selectedStudentIds = new Set<string>();

    pageSize = 50;
    currentPage = 1;

    toastVisible = false;
    toastMessage = '';
    toastVariant: 'success' | 'danger' = 'success';
    private toastTimer: any;
    // Tracks the current filter: 'all', 'active', or 'inactive'
    currentFilter: string = 'all';
    searchTerm: string = ''; // New variable for search
    rangeDates: Date[] | undefined;
    selectedDate: Date | undefined;
    selectedDateStr: string = '';
    selectedDateTime: Date | undefined;
    selectedDateTimeStr: string = '';
    excludedColleges: string[] = ['College A', 'College B'];
    excludeSearch: string = ''; // New variable

    courses: any[] = [];

    batches = [
        { id: 'June-A-2026', name: 'June-A-2026' },
        { id: 'June-B-2026', name: 'June-B-2026' },
        { id: 'July-A-2026', name: 'July-A-2026' },
        { id: 'July-B-2026', name: 'July-B-2026' },

    ];
    //this.buildBatchOptions();

    selectedCourseId: string = '';
    selectedBatchId: string = '';
    selectedCourseDetails: any = null;
    constructor(
        private internshipDataService: InternshipService,
        private assignedCourseService: AssignedCourseService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadCourses();
        this.loadInternships();
        setInterval(() => { this.loadInternships(); }, 60000);
    }

    loadCourses(): void {
        this.internshipDataService.getAllCourses().subscribe({
            next: (data: any) => {
                const courses = Array.isArray(data) ? data : (data?.data ?? []);
                this.courses = courses
                    .map((course: any) => ({
                        ...course,
                        id: course?._id?.toString?.() ?? course?.id?.toString?.() ?? '',
                        name: course?.name ?? course?.courseName ?? course?.title ?? '',
                    }))
                    .filter((course: any) => course.id && course.name);
            },
            error: (err: any) => {
                console.error('Error fetching courses:', err);
                this.courses = [];
            },
        });
    }

    loadInternships(): void {
        this.internshipDataService.getAllInternships().subscribe({
            next: (data: any) => {
                this.internships = (data ?? []).map((x: any) => ({
                    ...x,
                    assignedStatus: 'Checking',
                    assignedCourses: [],
                }));
                const validIds = new Set((this.internships ?? []).map((x: any) => x?._id).filter(Boolean));
                for (const id of Array.from(this.selectedStudentIds)) {
                    if (!validIds.has(id)) this.selectedStudentIds.delete(id);
                }

                const requests = (this.internships ?? []).map((internship: any) => {
                    const mobile = internship?.mobile?.toString?.() ?? internship?.mobile ?? '';
                    return this.assignedCourseService.getAllAssignedCoursesByMobile(mobile).pipe(
                        map((res: any) => ({
                            id: internship?._id,
                            courses: Array.isArray(res) ? res : (res?.data ?? []),
                        })),
                        catchError(() => of({ id: internship?._id, courses: [] }))
                    );
                });

                forkJoin(requests.length ? requests : [of(null)]).subscribe((results: any[]) => {
                    if (!Array.isArray(results)) return;
                    const courseMap = new Map<string, any[]>();
                    results.filter(Boolean).forEach((r: any) => courseMap.set(r.id, Array.isArray(r.courses) ? r.courses : []));

                    const selectedCourseId = this.selectedCourseId || '';
                    const selectedCourseName = this.courses.find(c => c.id === selectedCourseId)?.name || '';

                    this.internships = (this.internships ?? []).map((x: any) => {
                        const assignedCourses = courseMap.get(x?._id) ?? [];
                        const assignedStatus = this.computeAssignedStatus(assignedCourses, selectedCourseId, selectedCourseName);
                        return {
                            ...x,
                            assignedCourses,
                            assignedStatus,
                        };
                    });
                });
            },
            error: (err: any) => console.error('Error fetching internships:', err)
        });
    }

    private computeAssignedStatus(assignedCourses: any[], selectedCourseId: string, selectedCourseName: string): 'Assigned' | 'Un Assigned' | 'Checking' {
        // IMPORTANT: Status is based on BOTH mobile (API lookup) and course (match inside results).
        if (!Array.isArray(assignedCourses)) return 'Un Assigned';
        if (!selectedCourseId && !selectedCourseName) return 'Un Assigned';

        const isAssigned = assignedCourses.some((c: any) =>
            c?.courseId === selectedCourseId || (!!selectedCourseName && c?.course === selectedCourseName)
        );

        return isAssigned ? 'Assigned' : 'Un Assigned';
    }

    // Getter to return the filtered list to the HTML
    get filteredInternships() {
        // if (this.currentFilter === 'active') {
        //   return this.internships.filter(i => i.active === true);
        // } else if (this.currentFilter === 'inactive') {
        //   return this.internships.filter(i => i.active === false);
        // }
        // return this.internships;
        return this.internships.filter(item => {
            // 1. Status Filter Logic
            const matchesStatus =
                this.currentFilter === 'all' ||
                (this.currentFilter === 'active' && item.active === true) ||
                (this.currentFilter === 'inactive' && item.active === false);

            // 2. Search Logic (Name, Mobile, College)
            const search = this.searchTerm.toLowerCase();
            const matchesSearch =
                !search ||
                item.name?.toLowerCase().includes(search) ||
                item.mobile?.toString().includes(search) ||
                item.college?.toLowerCase().includes(search);

            // 3. Date Range Logic
            let matchesDate = true;
            if (this.selectedDateTime) {
                const itemDate = new Date(item.createdAt);
                matchesDate =
                    itemDate.getFullYear() === this.selectedDateTime.getFullYear() &&
                    itemDate.getMonth() === this.selectedDateTime.getMonth() &&
                    itemDate.getDate() === this.selectedDateTime.getDate();
            } else if (this.selectedDate) {
                const itemDate = new Date(item.createdAt);

                // Compare Year, Month, and Date specifically
                matchesDate =
                    itemDate.getDate() === this.selectedDate.getDate() &&
                    itemDate.getMonth() === this.selectedDate.getMonth() &&
                    itemDate.getFullYear() === this.selectedDate.getFullYear();
            }

            // 4. NEW: "Not In" College Filter
            // This checks if the record's college is NOT in the excludedColleges list
            // const matchesExclude = !this.excludeSearch || 
            //                    !item.college?.toLowerCase().includes(this.excludeSearch.toLowerCase());

            let matchesExclude = true;
            if (this.excludeSearch && item.college) {
                // Split by comma, remove whitespace, and convert to lowercase
                const excludedList = this.excludeSearch
                    .toLowerCase()
                    .split(',')
                    .map(c => c.trim())
                    .filter(c => c !== ''); // Remove empty strings from trailing commas

                // Check if the current item's college is included in the exclusion list
                const collegeLower = item.college.toLowerCase();

                // We use 'some' to check if any excluded term matches the college name
                const isExcluded = excludedList.some(excludedCollege =>
                    collegeLower.includes(excludedCollege)
                );

                matchesExclude = !isExcluded;
            }

            // 5. Batch Filter Logic (only applies when item has a batch field)
            const matchesBatch =
                !this.selectedBatchId ||
                !Object.prototype.hasOwnProperty.call(item ?? {}, 'batch') ||
                item.batch?.toString() === this.selectedBatchId;

            return matchesStatus && matchesSearch && matchesDate && matchesExclude && matchesBatch;
        });
    }

    get selectedStudentsCount(): number {
        return this.filteredInternships.filter((x: any) => this.selectedStudentIds.has(x?._id)).length;
    }

    isStudentSelected(id: string): boolean {
        return this.selectedStudentIds.has(id);
    }

    toggleStudent(id: string, checked: boolean): void {
        if (!id) return;
        if (checked) this.selectedStudentIds.add(id);
        else this.selectedStudentIds.delete(id);
    }

    toggleAllVisible(checked: boolean): void {
        const visibleIds = this.pagedInternships.map((x: any) => x?._id).filter(Boolean);
        if (checked) visibleIds.forEach((id: string) => this.selectedStudentIds.add(id));
        else visibleIds.forEach((id: string) => this.selectedStudentIds.delete(id));
    }

    get allVisibleSelected(): boolean {
        const visibleIds = this.pagedInternships.map((x: any) => x?._id).filter(Boolean);
        return visibleIds.length > 0 && visibleIds.every((id: string) => this.selectedStudentIds.has(id));
    }

    get someVisibleSelected(): boolean {
        const visibleIds = this.pagedInternships.map((x: any) => x?._id).filter(Boolean);
        return visibleIds.some((id: string) => this.selectedStudentIds.has(id)) && !this.allVisibleSelected;
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.filteredInternships.length / this.pageSize));
    }

    get pagedInternships(): any[] {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredInternships.slice(start, start + this.pageSize);
    }

    get pages(): number[] {
        const total = this.totalPages;
        const windowSize = 7;
        const half = Math.floor(windowSize / 2);

        let start = Math.max(1, this.currentPage - half);
        let end = Math.min(total, start + windowSize - 1);
        start = Math.max(1, end - windowSize + 1);

        const result: number[] = [];
        for (let p = start; p <= end; p++) result.push(p);
        return result;
    }

    goToPage(page: number): void {
        const total = this.totalPages;
        const next = Math.min(Math.max(1, page), total);
        this.currentPage = next;
    }

    nextPage(): void {
        this.goToPage(this.currentPage + 1);
    }

    prevPage(): void {
        this.goToPage(this.currentPage - 1);
    }

    onFiltersChanged(): void {
        this.currentPage = 1;
        // Recalculate Assigned/Un Assigned when course selection changes (no extra API calls).
        const selectedCourseId = this.selectedCourseId || '';
        const courseObj = this.courses.find(c => c.id === selectedCourseId);
        const selectedCourseName = courseObj?.name || '';

        // Store full course details to be used in assignedCourseHandler
        this.selectedCourseDetails = courseObj || null;
        console.log('this.selectedCourseDetails', this.selectedCourseDetails)
        this.internships = (this.internships ?? []).map((x: any) => {
            const assignedCourses: any[] = Array.isArray(x?.assignedCourses) ? x.assignedCourses : [];
            return {
                ...x,
                assignedStatus: this.computeAssignedStatus(assignedCourses, selectedCourseId, selectedCourseName),
            };
        });
    }

    private buildBatchOptions(): Array<{ id: string; name: string }> {
        // Technique: generate batches from month + section (A/B) so you don't maintain hardcoded lists.
        // Starts from June of the current year by default.
        const now = new Date();
        const startYear = now.getMonth() <= 4 ? now.getFullYear() : now.getFullYear(); // May/earlier still ok
        const startMonthIndex = 5; // June (0-based)

        const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const sections = ['A', 'B'];
        const monthsToGenerate = 8; // Jun..Jan by default

        const result: Array<{ id: string; name: string }> = [];
        for (let offset = 0; offset < monthsToGenerate; offset++) {
            const date = new Date(startYear, startMonthIndex + offset, 1);
            const m = monthShort[date.getMonth()];
            const y = date.getFullYear();
            for (const section of sections) {
                const label = `${m} ${section}`;
                result.push({ id: `${y}-${String(date.getMonth() + 1).padStart(2, '0')}-${section}`, name: label });
            }
        }

        // Keep display starting with "June A, June B, July A, July B, ..."
        return result;
    }

    // 4. Add a helper to clear dates
    onDateSelect() {
        // This triggers the getter to re-evaluate
    }

    clearDateFilter() {
        this.selectedDate = undefined;
        this.selectedDateStr = '';
        this.selectedDateTime = undefined;
        this.selectedDateTimeStr = '';
        this.onFiltersChanged();
    }

    onSelectedDateChange(value: string) {
        this.selectedDateStr = value || '';
        this.selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;
        this.onFiltersChanged();
    }

    onSelectedDateTimeChange(value: string) {
        this.selectedDateTimeStr = value || '';
        this.selectedDateTime = value ? new Date(`${value}T00:00:00`) : undefined;
        // If datetime is used, clear the date-only filter to avoid confusion.
        if (this.selectedDateTime) {
            this.selectedDate = undefined;
            this.selectedDateStr = '';
        }
        this.onFiltersChanged();
    }

    clearAllFilters(): void {
        this.searchTerm = '';
        this.excludeSearch = '';
        this.selectedCourseId = '';
        this.selectedBatchId = '';
        this.clearDateFilter();
        this.currentFilter = 'all';
        this.selectedStudentIds.clear();
        this.currentPage = 1;
    }

    showToast(message: string, variant: 'success' | 'danger'): void {
        this.toastMessage = message;
        this.toastVariant = variant;
        this.toastVisible = true;

        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toastVisible = false;
        }, 3000);
    }
    setFilter(filter: string): void {
        this.currentFilter = filter;
    }

    navigateToCreate(): void {
        this.router.navigate(['/features/internship/create']);
    }

    navigateToEdit(id: string): void {
        this.router.navigate(['/features/internship/edit', id]);
    }
    // ... inside InternshipListComponent class

    downloadCSV(): void {
        const data = this.filteredInternships;
        if (data.length === 0) return;

        // 1. Define Headers
        const headers = ['No', 'Name', 'Email', 'Mobile', 'College', 'Program', 'Type', 'Status', 'Date'];

        // 2. Map data to rows
        const rows = data.map((item, index) => [
            index + 1,
            `"${item.name || ''}"`, // Wrap in quotes to handle commas in names
            item.email || '',
            item.mobile || '',
            `"${item.college || ''}"`,
            `"${item.program || ''}"`,
            item.internshipType || '',
            item.active ? 'Active' : 'Inactive',
            new Date(item.createdAt).toLocaleDateString()
        ]);

        // 3. Combine into CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // 4. Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.setAttribute('href', url);
        link.setAttribute('download', `internships_export_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    assignedCourseHandler(): void {
        if (!this.selectedCourseDetails) {
            this.showToast('Please select a valid course first.', 'danger');
            return;
        }

        const course = this.selectedCourseDetails;
        const batchId = this.selectedBatchId || '';
        const batchName = this.batches.find(b => b.id === this.selectedBatchId)?.name || '';

        const selected = this.filteredInternships.filter((x: any) => this.selectedStudentIds.has(x?._id));
        if (selected.length === 0) return;

        const payload: AssignedCoursePayload[] = selected.map((item: any) => ({
            courseId: course.id,
            courseName: course.name,
            type: course.type || '',
            category: course.category || '',
            description: course.description || '',
            tag: course.tag || '',
            price: course.price || 0,
            discountType: course.discountType || 'Percentage',
            discount: course.discount || 0,
            finalPrice: course.finalPrice || 0,
            rating: course.rating || 0,
            imagePath: course.imagePath || '',
            active: course.active ?? true,
            createdAt: course.createdAt || new Date(),
            isPaid: course.isPaid ?? false,
            batchId,
            batchName,
            studentName: item?.name || '',
            email: item?.email || '',
            mobile: item?.mobile?.toString?.() ?? (item?.mobile || ''),
            program: item?.program || '',
            internshipType: item?.internshipType || '',
            college: item?.college || '',
        }));
        this.assignedCourseService.assignedCourses(payload).subscribe({
            next: () => {
                this.showToast('Assigned course saved successfully.', 'success');
                this.clearAllFilters();
            },
            error: () => {
                this.showToast('Failed to assign course. Please try again.', 'danger');
            }
        });
    }
}
