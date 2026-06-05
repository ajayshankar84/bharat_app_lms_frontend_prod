import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternshipService } from '../../core/services/internship-.service';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  program: string;
  college: string;
  avatar: string;
  enrollmentDate: string;
  active: boolean;
  attendance: 'present' | 'unmarked';
  pendingAttendance: 'present' | 'unmarked';
  isDirty: boolean;
}

interface AttendanceRecord {
  studentId: string;
  date: string;
  status: 'present';
}

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  iconClass: string;
  change: string;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss']
})
export class AttendanceComponent implements OnInit, OnDestroy {
  students: Student[] = [];
  filteredStudents: Student[] = [];
  paginatedStudents: Student[] = [];
  attendanceHistory: AttendanceRecord[] = [];

  isLoading = false;
  isSubmitting = false;

  searchText = '';
  sortColumn = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  selectAll = false;
  selectedIds = new Set<string>();
  filterCourse = '';
  filterStatus = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  pageSizeOptions = [10, 20, 50, 100];

  selectedDate = '';
  today = new Date();
  currentTime = '';
  greetingText = '';
  greetingIcon = 'bi-sun-fill';
  heroSubtitle = '';

  showModal = false;
  modalStudent: Student = this.getEmptyStudent();

  showHistoryModal = false;
  historyStudent: Student | null = null;
  historyRecords: AttendanceRecord[] = [];
  historyMonth = '';

  showSuccessToast = false;
  successMessage = '';

  private clockInterval: any;
  private toastTimer: any;

  statsCards: StatCard[] = [
    { label: 'Total Students', value: 0, icon: 'bi-people-fill', iconClass: 'stat-card__icon--blue', change: '' },
    { label: 'Present', value: 0, icon: 'bi-check-circle-fill', iconClass: 'stat-card__icon--green', change: '' },
    { label: 'Unmarked', value: 0, icon: 'bi-dash-circle-fill', iconClass: 'stat-card__icon--orange', change: '' },
    { label: 'Pending Changes', value: 0, icon: 'bi-pencil-square', iconClass: 'stat-card__icon--purple', change: '' }
  ];

  courses: string[] = [];

  constructor(private internshipService: InternshipService) { }

  ngOnInit(): void {
    const now = new Date();
    this.selectedDate = this.formatDate(now);
    this.historyMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.loadStudentsFromApi();
    this.updateClock();
    this.updateGreeting();
    this.clockInterval = setInterval(() => {
      this.updateClock();
      this.updateGreeting();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  loadStudentsFromApi(): void {
    this.isLoading = true;
    this.internshipService.getAllInternships().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        this.students = list.map((item: any) => ({
          id: item._id ?? item.id ?? '',
          name: item.name ?? '',
          email: item.email ?? '',
          phone: item.mobile?.toString() ?? '',
          course: item.internshipType ?? '',
          program: item.program ?? '',
          college: item.college ?? '',
          avatar: this.getInitials(item.name ?? ''),
          enrollmentDate: item.createdAt ? this.formatDate(new Date(item.createdAt)) : '',
          active: item.active ?? true,
          attendance: 'unmarked' as const,
          pendingAttendance: 'unmarked' as const,
          isDirty: false
        }));
        this.courses = [...new Set(this.students.map(s => s.course).filter(Boolean))];
        this.loadAttendanceForDate();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private updateClock(): void {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    this.currentTime = `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }

  private updateGreeting(): void {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.greetingText = 'Good Morning';
      this.greetingIcon = 'bi-sunrise-fill';
      this.heroSubtitle = 'Mark today\'s attendance and submit when done.';
    } else if (hour >= 12 && hour < 17) {
      this.greetingText = 'Good Afternoon';
      this.greetingIcon = 'bi-sun-fill';
      this.heroSubtitle = 'Stay on top of attendance records this afternoon.';
    } else if (hour >= 17 && hour < 21) {
      this.greetingText = 'Good Evening';
      this.greetingIcon = 'bi-sunset-fill';
      this.heroSubtitle = 'Review and finalize today\'s attendance.';
    } else {
      this.greetingText = 'Good Night';
      this.greetingIcon = 'bi-moon-stars-fill';
      this.heroSubtitle = 'Late night? Don\'t forget to save attendance!';
    }
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getEmptyStudent(): Student {
    return { id: '', name: '', email: '', phone: '', course: '', program: '', college: '', avatar: '', enrollmentDate: '', active: true, attendance: 'unmarked', pendingAttendance: 'unmarked', isDirty: false };
  }

  loadAttendanceForDate(): void {
    this.students.forEach(s => {
      const record = this.attendanceHistory.find(r => r.studentId === s.id && r.date === this.selectedDate);
      s.attendance = record ? 'present' : 'unmarked';
      s.pendingAttendance = s.attendance;
      s.isDirty = false;
    });
    this.updateStats();
  }

  onDateChange(): void {
    if (this.hasPendingChanges) {
      const confirm = window.confirm('You have unsaved changes. Switch date anyway?');
      if (!confirm) return;
    }
    this.loadAttendanceForDate();
    this.applyFilters();
  }

  get isToday(): boolean {
    return this.selectedDate === this.formatDate(new Date());
  }

  get formattedSelectedDate(): string {
    if (!this.selectedDate) return '';
    const d = new Date(this.selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  goToToday(): void {
    this.selectedDate = this.formatDate(new Date());
    this.onDateChange();
  }

  applyFilters(): void {
    let data = [...this.students];

    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      data = data.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search) ||
        s.phone.includes(search) ||
        s.course.toLowerCase().includes(search) ||
        s.program.toLowerCase().includes(search) ||
        s.college.toLowerCase().includes(search)
      );
    }

    if (this.filterCourse) {
      data = data.filter(s => s.course === this.filterCourse);
    }

    if (this.filterStatus) {
      data = data.filter(s => s.pendingAttendance === this.filterStatus);
    }

    data.sort((a, b) => {
      const valA = (a as any)[this.sortColumn]?.toString().toLowerCase() || '';
      const valB = (b as any)[this.sortColumn]?.toString().toLowerCase() || '';
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredStudents = data;
    this.totalPages = Math.ceil(this.filteredStudents.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    this.updatePagination();
    this.updateStats();
    this.checkSelectAll();
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedStudents = this.filteredStudents.slice(start, start + this.pageSize);
  }

  updateStats(): void {
    let present = 0, unmarked = 0, pending = 0;
    this.students.forEach(s => {
      if (s.pendingAttendance === 'present') present++;
      else unmarked++;
      if (s.isDirty) pending++;
    });
    this.statsCards[0].value = this.students.length;
    this.statsCards[0].change = `${this.filteredStudents.length} shown`;
    this.statsCards[1].value = present;
    this.statsCards[1].change = `${this.students.length ? Math.round((present / this.students.length) * 100) : 0}%`;
    this.statsCards[2].value = unmarked;
    this.statsCards[2].change = `${this.students.length ? Math.round((unmarked / this.students.length) * 100) : 0}%`;
    this.statsCards[3].value = pending;
    this.statsCards[3].change = pending > 0 ? 'Click Submit to save' : 'No changes';
  }

  get pendingChangesCount(): number {
    return this.students.filter(s => s.isDirty).length;
  }

  get hasPendingChanges(): boolean {
    return this.pendingChangesCount > 0;
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearSearch(): void { this.searchText = ''; this.onSearch(); }

  clearFilters(): void {
    this.searchText = '';
    this.filterCourse = '';
    this.filterStatus = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  onSort(column: string): void {
    if (this.sortColumn === column) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = column; this.sortDirection = 'asc'; }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'bi-arrow-down-up';
    return this.sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
      this.checkSelectAll();
    }
  }

  onPageSizeChange(): void { this.currentPage = 1; this.applyFilters(); }

  getPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  togglePendingAttendance(student: Student): void {
    student.pendingAttendance = student.pendingAttendance === 'present' ? 'unmarked' : 'present';
    student.isDirty = student.pendingAttendance !== student.attendance;
    this.updateStats();
  }

  selectAllStudents(): void {
    this.filteredStudents.forEach(s => this.selectedIds.add(s.id));
    this.checkSelectAll();
  }

  deselectAllStudents(): void {
    this.selectedIds.clear();
    this.selectAll = false;
  }

  toggleSelectAll(): void {
    if (this.selectAll) this.paginatedStudents.forEach(s => this.selectedIds.add(s.id));
    else this.paginatedStudents.forEach(s => this.selectedIds.delete(s.id));
  }

  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
    this.checkSelectAll();
  }

  checkSelectAll(): void {
    this.selectAll = this.paginatedStudents.length > 0 &&
      this.paginatedStudents.every(s => this.selectedIds.has(s.id));
  }

  get allFilteredSelected(): boolean {
    return this.filteredStudents.length > 0 && this.filteredStudents.every(s => this.selectedIds.has(s.id));
  }

  get someVisibleSelected(): boolean {
    const visibleIds = this.paginatedStudents.map(s => s.id);
    return visibleIds.some(id => this.selectedIds.has(id)) && !this.selectAll;
  }

  markSelectedPending(): void {
    if (this.selectedIds.size === 0) return;
    this.students.forEach(s => {
      if (this.selectedIds.has(s.id)) {
        s.pendingAttendance = 'present';
        s.isDirty = s.pendingAttendance !== s.attendance;
      }
    });
    this.selectedIds.clear();
    this.selectAll = false;
    this.updateStats();
  }

  unmarkSelectedPending(): void {
    if (this.selectedIds.size === 0) return;
    this.students.forEach(s => {
      if (this.selectedIds.has(s.id)) {
        s.pendingAttendance = 'unmarked';
        s.isDirty = s.pendingAttendance !== s.attendance;
      }
    });
    this.selectedIds.clear();
    this.selectAll = false;
    this.updateStats();
  }

  markAllPending(): void {
    this.students.forEach(s => {
      s.pendingAttendance = 'present';
      s.isDirty = s.pendingAttendance !== s.attendance;
    });
    this.selectedIds.clear();
    this.selectAll = false;
    this.updateStats();
  }

  resetAllPending(): void {
    this.students.forEach(s => {
      s.pendingAttendance = 'unmarked';
      s.isDirty = s.pendingAttendance !== s.attendance;
    });
    this.selectedIds.clear();
    this.selectAll = false;
    this.updateStats();
  }

  discardChanges(): void {
    if (!this.hasPendingChanges) return;
    const confirm = window.confirm(`Discard ${this.pendingChangesCount} unsaved change${this.pendingChangesCount > 1 ? 's' : ''}?`);
    if (!confirm) return;
    this.students.forEach(s => {
      s.pendingAttendance = s.attendance;
      s.isDirty = false;
    });
    this.updateStats();
    this.applyFilters();
  }

  submitAttendance(): void {
    if (!this.hasPendingChanges || this.isSubmitting) return;
    this.isSubmitting = true;

    const changes = this.students.filter(s => s.isDirty);

    setTimeout(() => {
      changes.forEach(s => {
        s.attendance = s.pendingAttendance;
        this.saveAttendanceRecord(s);
        s.isDirty = false;
      });
      this.isSubmitting = false;
      this.updateStats();
      this.applyFilters();
      this.showToast(`Attendance saved for ${changes.length} student${changes.length > 1 ? 's' : ''}`);
    }, 600);
  }

  private saveAttendanceRecord(student: Student): void {
    const idx = this.attendanceHistory.findIndex(r => r.studentId === student.id && r.date === this.selectedDate);
    if (student.attendance === 'unmarked') {
      if (idx !== -1) this.attendanceHistory.splice(idx, 1);
    } else {
      if (idx !== -1) this.attendanceHistory[idx].status = 'present';
      else this.attendanceHistory.push({ studentId: student.id, date: this.selectedDate, status: 'present' });
    }
  }

  private showToast(message: string): void {
    this.successMessage = message;
    this.showSuccessToast = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.showSuccessToast = false; }, 3500);
  }

  closeToast(): void {
    this.showSuccessToast = false;
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  openViewModal(student: Student): void {
    this.modalStudent = { ...student };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  openHistoryModal(student: Student): void {
    this.historyStudent = { ...student };
    this.loadHistoryRecords();
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void { this.showHistoryModal = false; this.historyStudent = null; }

  onHistoryMonthChange(): void { this.loadHistoryRecords(); }

  private loadHistoryRecords(): void {
    if (!this.historyStudent) return;
    const [year, month] = this.historyMonth.split('-').map(Number);
    this.historyRecords = this.attendanceHistory
      .filter(r => {
        if (r.studentId !== this.historyStudent!.id) return false;
        const [ry, rm] = r.date.split('-').map(Number);
        return ry === year && rm === month;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getHistoryStats(): { present: number; totalDays: number; percentage: number } {
    const present = this.historyRecords.length;
    const [year, month] = this.historyMonth.split('-').map(Number);
    const now = new Date();
    let totalDays = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      if (date > now) break;
      if (date.getDay() !== 0 && date.getDay() !== 6) totalDays++;
    }
    const percentage = totalDays ? Math.round((present / totalDays) * 100) : 0;
    return { present, totalDays, percentage };
  }

  getFormattedHistoryDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  getDayName(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', { weekday: 'long' });
  }

  getAttendanceBadgeClass(status: string): string {
    return status === 'present' ? 'badge--present' : 'badge--unmarked';
  }

  private getInitials(name: string): string {
    return name.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #4a90e2, #357abd)',
      'linear-gradient(135deg, #22c55e, #16a34a)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #a855f7, #7c3aed)',
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #06b6d4, #0891b2)',
      'linear-gradient(135deg, #ec4899, #be185d)',
      'linear-gradient(135deg, #14b8a6, #0d9488)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterCourse || this.filterStatus);
  }

  get startEntry(): number {
    return this.filteredStudents.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get endEntry(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredStudents.length);
  }
}