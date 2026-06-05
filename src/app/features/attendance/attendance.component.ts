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
  avatar: string;
  enrollmentDate: string;
  attendance: 'present' | 'absent' | 'late' | 'unmarked';
}

interface AttendanceRecord {
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
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

  searchText = '';
  sortColumn = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  selectAll = false;
  selectedIds = new Set<string>();
  filterCourse = '';
  filterStatus = '';

  currentPage = 1;
  pageSize = 8;
  totalPages = 1;
  pageSizeOptions = [5, 8, 10, 20, 50];

  selectedDate = '';
  today = new Date();
  currentTime = '';
  greetingText = '';
  greetingIcon = 'bi-sun-fill';
  heroSubtitle = '';

  showModal = false;
  modalMode: 'add' | 'edit' | 'view' = 'add';
  modalStudent: Student = this.getEmptyStudent();

  showDeleteModal = false;
  deleteStudentId: string | null = null;
  deleteStudentName = '';

  showHistoryModal = false;
  historyStudent: Student | null = null;
  historyRecords: AttendanceRecord[] = [];
  historyMonth = '';

  bulkAttendanceStatus = '';

  private clockInterval: any;

  statsCards: StatCard[] = [
    { label: 'Total Students', value: 0, icon: 'bi-people-fill', iconClass: 'stat-card__icon--blue', change: '' },
    { label: 'Present Today', value: 0, icon: 'bi-check-circle-fill', iconClass: 'stat-card__icon--green', change: '' },
    { label: 'Absent Today', value: 0, icon: 'bi-x-circle-fill', iconClass: 'stat-card__icon--red', change: '' },
    { label: 'Late Today', value: 0, icon: 'bi-clock-fill', iconClass: 'stat-card__icon--orange', change: '' }
  ];

  courses: string[] = [];

  constructor(private internshipService: InternshipService) {}

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
          avatar: this.getInitials(item.name ?? ''),
          enrollmentDate: item.createdAt ? this.formatDate(new Date(item.createdAt)) : '',
          attendance: 'unmarked'
        }));
        this.courses = [...new Set(this.students.map(s => s.course).filter(Boolean))];
        this.loadAttendanceForDate();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
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
      this.heroSubtitle = 'Mark today\'s attendance and keep track of your students.';
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
    return { id: '', name: '', email: '', phone: '', course: '', program: '', avatar: '', enrollmentDate: '', attendance: 'unmarked' };
  }

  loadAttendanceForDate(): void {
    this.students.forEach(s => {
      const record = this.attendanceHistory.find(r => r.studentId === s.id && r.date === this.selectedDate);
      s.attendance = record ? record.status : 'unmarked';
    });
    this.updateStats();
  }

  onDateChange(): void {
    this.loadAttendanceForDate();
    this.applyFilters();
  }

  get isToday(): boolean {
    return this.selectedDate === this.formatDate(new Date());
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
        s.program.toLowerCase().includes(search)
      );
    }

    if (this.filterCourse) {
      data = data.filter(s => s.course === this.filterCourse);
    }

    if (this.filterStatus) {
      data = data.filter(s => s.attendance === this.filterStatus);
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
    let present = 0, absent = 0, late = 0;
    this.students.forEach(s => {
      if (s.attendance === 'present') present++;
      else if (s.attendance === 'absent') absent++;
      else if (s.attendance === 'late') late++;
    });
    this.statsCards[0].value = this.students.length;
    this.statsCards[0].change = `${this.courses.length} courses`;
    this.statsCards[1].value = present;
    this.statsCards[1].change = `${this.students.length ? Math.round((present / this.students.length) * 100) : 0}%`;
    this.statsCards[2].value = absent;
    this.statsCards[2].change = `${this.students.length ? Math.round((absent / this.students.length) * 100) : 0}%`;
    this.statsCards[3].value = late;
    this.statsCards[3].change = `${this.students.length ? Math.round((late / this.students.length) * 100) : 0}%`;
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchText = '';
    this.onSearch();
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterCourse = '';
    this.filterStatus = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
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

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  markAttendance(student: Student, status: 'present' | 'absent' | 'late'): void {
    student.attendance = student.attendance === status ? 'unmarked' : status;
    this.saveAttendanceRecord(student);
    this.updateStats();
  }

  private saveAttendanceRecord(student: Student): void {
    const idx = this.attendanceHistory.findIndex(r => r.studentId === student.id && r.date === this.selectedDate);
    if (student.attendance === 'unmarked') {
      if (idx !== -1) this.attendanceHistory.splice(idx, 1);
    } else {
      if (idx !== -1) {
        this.attendanceHistory[idx].status = student.attendance;
      } else {
        this.attendanceHistory.push({ studentId: student.id, date: this.selectedDate, status: student.attendance });
      }
    }
  }

  selectAllStudents(): void {
    this.students.forEach(s => this.selectedIds.add(s.id));
    this.selectAll = true;
  }

  deselectAllStudents(): void {
    this.selectedIds.clear();
    this.selectAll = false;
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.paginatedStudents.forEach(s => this.selectedIds.add(s.id));
    } else {
      this.paginatedStudents.forEach(s => this.selectedIds.delete(s.id));
    }
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

  get allStudentsSelected(): boolean {
    return this.students.length > 0 && this.selectedIds.size === this.students.length;
  }

  markSelectedAs(status: 'present' | 'absent' | 'late'): void {
    if (this.selectedIds.size === 0) return;
    this.students.forEach(s => {
      if (this.selectedIds.has(s.id)) {
        s.attendance = status;
        this.saveAttendanceRecord(s);
      }
    });
    this.selectedIds.clear();
    this.selectAll = false;
    this.bulkAttendanceStatus = '';
    this.updateStats();
    this.applyFilters();
  }

  markAllPresent(): void {
    this.students.forEach(s => {
      s.attendance = 'present';
      this.saveAttendanceRecord(s);
    });
    this.selectedIds.clear();
    this.selectAll = false;
    this.updateStats();
    this.applyFilters();
  }

  resetAllAttendance(): void {
    this.students.forEach(s => {
      s.attendance = 'unmarked';
      this.saveAttendanceRecord(s);
    });
    this.selectedIds.clear();
    this.selectAll = false;
    this.updateStats();
    this.applyFilters();
  }

  openEditModal(student: Student): void {
    this.modalMode = 'edit';
    this.modalStudent = { ...student };
    this.showModal = true;
  }

  openViewModal(student: Student): void {
    this.modalMode = 'view';
    this.modalStudent = { ...student };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  openDeleteModal(student: Student): void {
    this.deleteStudentId = student.id;
    this.deleteStudentName = student.name;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteStudentId = null;
  }

  confirmDelete(): void {
    if (this.deleteStudentId !== null) {
      this.students = this.students.filter(s => s.id !== this.deleteStudentId);
      this.selectedIds.delete(this.deleteStudentId!);
      this.attendanceHistory = this.attendanceHistory.filter(r => r.studentId !== this.deleteStudentId);
      this.courses = [...new Set(this.students.map(s => s.course))];
      this.closeDeleteModal();
      this.applyFilters();
    }
  }

  openHistoryModal(student: Student): void {
    this.historyStudent = { ...student };
    this.loadHistoryRecords();
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.historyStudent = null;
  }

  onHistoryMonthChange(): void {
    this.loadHistoryRecords();
  }

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

  getHistoryStats(): { present: number; absent: number; late: number; percentage: number } {
    const present = this.historyRecords.filter(r => r.status === 'present').length;
    const absent = this.historyRecords.filter(r => r.status === 'absent').length;
    const late = this.historyRecords.filter(r => r.status === 'late').length;
    const total = this.historyRecords.length;
    const percentage = total ? Math.round(((present + late) / total) * 100) : 0;
    return { present, absent, late, percentage };
  }

  getFormattedHistoryDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  getDayName(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', { weekday: 'long' });
  }

  isFormValid(): boolean {
    return !!(this.modalStudent.name?.trim() &&
      this.modalStudent.email?.trim() &&
      this.modalStudent.phone?.trim() &&
      this.modalStudent.course?.trim());
  }

  getAttendanceBadgeClass(status: string): string {
    switch (status) {
      case 'present': return 'badge--present';
      case 'absent': return 'badge--absent';
      case 'late': return 'badge--late';
      default: return 'badge--unmarked';
    }
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