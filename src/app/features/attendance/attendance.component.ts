import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternshipService } from '../../core/services/internship-.service';
import { Router } from '@angular/router';
import { AttendanceService } from '../../core/services/attendance.service';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AssignedCourseService } from '../../core/services/assigned-course.service';

//
@Component({
    selector: 'app-attendance',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './attendance.component.html',
    styleUrls: ['./attendance.component.scss'],
})
export class AttendanceComponent {
    internships: any[] = [];
    selectedStudentIds = new Set<string>();
    dbSelectedStudentIds = new Set<string>();

    pageSize = 50;
    currentPage = 1;

    toastVisible = false;
    toastMessage = '';
    toastVariant: 'success' | 'danger' = 'success';
    private toastTimer: any;
    // Tracks the current filter: 'all', 'active', or 'inactive'
    currentFilter: string = 'all';
    showOnlyUnmarked: boolean = false;
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
    isAttendanceModalVisible = false;
    attendanceRecords: any[] = [];
    constructor(
        private internshipDataService: InternshipService,
        private router: Router,
        private attendanceService: AttendanceService,
        private assignedCourseService: AssignedCourseService

    ) { }

    ngOnInit(): void {
        // 1. Initialize all filters to a neutral 'Show All' state.
        // This ensures the filteredInternships getter includes all records on page load.
        this.selectedDateTimeStr = '';
        this.selectedDate = undefined;
        this.selectedCourseId = '';
        this.selectedBatchId = '';
        this.searchTerm = '';
        this.excludeSearch = '';
        this.currentFilter = 'all';

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


            },
            error: (err: any) => console.error('Error fetching internships:', err)
        });
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

            // 6. Marked Attendance Filter
            const matchesUnmarked = !this.showOnlyUnmarked || !this.isAttendanceAlreadyMarked(item._id);

            return (
                matchesStatus && matchesSearch && matchesDate && matchesExclude && matchesBatch && matchesUnmarked
            );
        });
    }

    get selectedStudentsCount(): number {
        return this.filteredInternships.filter((x: any) => this.selectedStudentIds.has(x?._id)).length;
    }

    isStudentSelected(id: string): boolean {
        return this.selectedStudentIds.has(id);
    }

    isAttendanceAlreadyMarked(id: string): boolean {
        return this.dbSelectedStudentIds.has(id);
    }

    toggleStudent(id: string, checked: boolean): void {
        if (!id || this.isAttendanceAlreadyMarked(id)) return;
        if (checked) this.selectedStudentIds.add(id);
        else this.selectedStudentIds.delete(id);
    }

    toggleAllVisible(checked: boolean): void {
        const visibleIds = this.pagedInternships.map((x: any) => x?._id).filter(Boolean);
        if (checked) {
            visibleIds.forEach((id: string) => this.selectedStudentIds.add(id));
        } else {
            visibleIds.forEach((id: string) => {
                // Only remove if it's not already saved in the DB
                if (!this.isAttendanceAlreadyMarked(id)) {
                    this.selectedStudentIds.delete(id);
                }
            });
        }
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
        this.selectedStudentIds.clear();
        this.dbSelectedStudentIds.clear();

        // 3. Keep the Date object in sync with the string value whenever filters change
        // if (this.selectedDateTimeStr) {
        //     this.selectedDate = new Date(this.selectedDateTimeStr + 'T00:00:00');
        // } else {
        //     this.selectedDate = undefined;
        // }



        // Recalculate Assigned/Un Assigned when course selection changes (no extra API calls).
        const selectedCourseId = this.selectedCourseId || '';
        const courseObj = this.courses.find(c => c.id === selectedCourseId);
        // Store full course details to be used in assignedCourseHandler
        this.selectedCourseDetails = courseObj || null;

        this.syncAttendanceSelection();
    }

    openAttendanceModal(): void {
        // 1. Check if the date string is present before proceeding
        if (!this.selectedDateTimeStr) {
            this.showToast('Please select a date to view records.', 'danger');
            return;
        }

        this.isAttendanceModalVisible = true;

        // 2. Use this.selectedDateTimeStr directly as it is already a string (YYYY-MM-DD)
        this.attendanceService.getAllAttendancesByDate(this.selectedDateTimeStr).subscribe({
            next: (res: any) => {
                 this.attendanceRecords=res;
                // const records = Array.isArray(res) ? res : (res?.data ?? []);
                // this.attendanceRecords = records.filter((record: any) =>
                //     record.courseId === this.selectedCourseId &&
                //     record.batchId === this.selectedBatchId
                // );
                // console.log('Attendance Records:', this.attendanceRecords);
            },
            error: (err) => console.error('Error fetching attendance for modal:', err)
        });
    }

    closeAttendanceModal(): void {
        this.isAttendanceModalVisible = false;
    }

    private syncAttendanceSelection(): void {
        if (!this.selectedCourseId || !this.selectedBatchId || !this.selectedDateTimeStr) {
            return;
        }

        this.attendanceService.getAllAttendancesByDate(this.selectedDateTimeStr).subscribe({
            next: (res: any) => {
                const records = Array.isArray(res) ? res : (res?.data ?? []);
                this.dbSelectedStudentIds.clear();

                records.forEach((record: any) => {
                    if (
                        record.courseId === this.selectedCourseId &&
                        record.batchId === this.selectedBatchId &&
                        record.isPresent === true
                    ) {
                        this.selectedStudentIds.add(record.studentId);
                        this.dbSelectedStudentIds.add(record.studentId);
                    }
                });
            },
            error: (err) => console.error('Error syncing attendance selection:', err)
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

    // onSelectedDateTimeChange(value: string) {
    //     this.selectedDateTimeStr = value || '';
    //     this.selectedDateTime = value ? new Date(`${value}T00:00:00`) : undefined;
    //     // If datetime is used, clear the date-only filter to avoid confusion.
    //     if (this.selectedDateTime) {
    //         this.selectedDate = undefined;
    //         this.selectedDateStr = '';
    //     }
    //     this.onFiltersChanged();
    // }

    clearAllFilters(): void {
        this.searchTerm = '';
        this.excludeSearch = '';
        this.selectedCourseId = '';
        this.selectedBatchId = '';
        this.clearDateFilter();
        this.showOnlyUnmarked = false;
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

    markAttendanceHandler(): void {
        // 1. Extract the full details of all selected students
        const attendanceDate = this.selectedDateTime || this.selectedDate || new Date();
        const markedAtStr = attendanceDate.toISOString();

        const selectedStudents = this.internships
            .filter(student => this.selectedStudentIds.has(student._id))
            .map(student => ({
                studentId: student._id,
                studentName: student.name,
                mobile: student.mobile,
                email: student.email,
                program: student.program,
                internshipType: student.internshipType,
                college: student.college,
                courseId: this.selectedCourseId,
                courseName: this.selectedCourseDetails?.name || '',
                batchId: this.selectedBatchId,
                batchName: this.batches.find(b => b.id === this.selectedBatchId)?.name || '',
                markedAt: markedAtStr,
                isPresent: true

            }));



        console.log('Attendance Payload Prepared:', selectedStudents);

        // Typically, you would now call a service method to save this data
        // Example:
        this.attendanceService.saveAttendance(selectedStudents).subscribe({
            next: () => {
                this.showToast('Attendance marked successfully', 'success');
                selectedStudents.forEach(s => this.dbSelectedStudentIds.add(s.studentId));
            },
            error: () => this.showToast('Failed to mark attendance', 'danger')
        });
    }

    downloadAttendanceModalCSV(): void {
        if (this.attendanceRecords.length === 0) return;

        // 1. Define Headers
        const headers = ['Student Name', 'Mobile', 'Email', 'Program', 'College', 'Batch', 'Type', 'Status'];

        // 2. Map attendance records to rows
        const rows = this.attendanceRecords.map(record => [
            `"${record.studentName || ''}"`,
            record.mobile || '',
            record.email || '',
            `"${record.program || ''}"`,
            `"${record.college || ''}"`,
            record.batchName || '',
            record.internshipType || '',
            'Present'
        ]);

        // 3. Combine into CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // 4. Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `attendance_${this.selectedCourseDetails?.name || 'course'}_${this.selectedBatchId}_${this.selectedDateTimeStr}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', filename.replace(/\s+/g, '_'));
        link.click();
    }
}
