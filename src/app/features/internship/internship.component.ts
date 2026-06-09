import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InternshipService } from '../../core/services/internship-.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-internship',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './internship.component.html',
  styleUrl: './internship.component.scss'
})
export class InternshipComponent implements OnInit {
  internships: any[] = [];
  isLoading = true;
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  selectedIntern: any = null;
  internToDelete: any = null;
  toastVisible = false;
  toastMessage = '';
  toastVariant: 'success' | 'danger' = 'success';
  private toastTimer: any;
  programOptions: string[] = ['BCA', 'B.Tech', 'M.Tech', 'BSC IT', 'CS', 'BBA', 'MBA', 'PG Diploma'];

  constructor(private internshipService: InternshipService, private router: Router) {}

 ngOnInit(): void {
    this.loadInternships();
 }

  loadInternships(): void {
    this.isLoading = true;
    this.internshipService.getAllInternships().subscribe({
      next: (data) => {
        this.internships = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading internships:', err);
        this.isLoading = false;
      }
    });
  }

  get filteredInternships(): any[] {
    const term = this.searchTerm.toLowerCase().trim();
    const start = this.startDate ? new Date(this.startDate + 'T00:00:00') : null;
    const end = this.endDate ? new Date(this.endDate + 'T23:59:59') : null;

    return this.internships.filter(intern => {
      // 1. Search Filter
      const matchesSearch = !term || 
        intern.name?.toLowerCase().includes(term) ||
        intern.email?.toLowerCase().includes(term) ||
        intern.mobile?.toLowerCase().includes(term);

      // 2. Date Range Filter
      let matchesDate = true;
      if (start || end) {
        const itemDate = intern.createdAt ? new Date(intern.createdAt) : null;
        if (!itemDate) {
          matchesDate = false;
        } else {
          if (start && end) matchesDate = itemDate >= start && itemDate <= end;
          else if (start) matchesDate = itemDate >= start;
          else if (end) matchesDate = itemDate <= end;
        }
      }

      return matchesSearch && matchesDate;
    });
  }

  editIntern(intern: any): void {
    this.selectedIntern = { 
      ...intern,
      total: intern.total || 0,
      paid: intern.paid || 0
    };
    this.isEditModalOpen = true;
  }

  saveIntern(): void {
    if (this.selectedIntern?._id) {
      this.isLoading = true;
      this.internshipService.updateInternship(this.selectedIntern._id, this.selectedIntern).subscribe({
        next: () => {
          this.loadInternships();
          this.closeModals();
          this.showToast('Internship updated successfully', 'success');
        },
        error: (err) => {
          console.error('Error updating internship:', err);
          this.isLoading = false;
          this.showToast('Failed to update internship', 'danger');
        }
      });
    }
  }

  confirmDelete(intern: any): void {
    this.internToDelete = intern;
    this.isDeleteModalOpen = true;
  }

  executeDelete(): void {
    if (this.internToDelete?._id) {
      this.isLoading = true;
      this.internshipService.deleteInternship(this.internToDelete._id).subscribe({
        next: () => {
          this.loadInternships();
          this.closeModals();
          this.showToast('Internship deleted successfully', 'success');
        },
        error: (err) => {
          console.error('Error deleting internship:', err);
          this.isLoading = false;
          this.showToast('Failed to delete internship', 'danger');
        }
      });
    }
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

  closeModals(): void {
    this.isEditModalOpen = false;
    this.isDeleteModalOpen = false;
    this.selectedIntern = null;
    this.internToDelete = null;
  }

  clearDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
  }

  setRangeFilter(range: string): void {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case '7days': start.setDate(end.getDate() - 7); break;
      case '15days': start.setDate(end.getDate() - 15); break;
      case '1month': start.setMonth(end.getMonth() - 1); break;
      case '2months': start.setMonth(end.getMonth() - 2); break;
      case '6months': start.setMonth(end.getMonth() - 6); break;
    }

    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  downloadCSV(): void {
    const data = this.filteredInternships;
    if (data.length === 0) return;

    // 1. Define Headers
    const headers = ['No', 'Name', 'Email', 'Mobile', 'City', 'Program', 'Type', 'University', 'Status', 'Date'];

    // 2. Map data to rows
    const rows = data.map((item, index) => [
      index + 1,
      `"${item.name || ''}"`, // Wrap in quotes to handle commas in names
      item.email || '',
      item.mobile || '',
      `"${item.city || ''}"`,
      `"${item.program || ''}"`,
      item.internshipType || '',
      `"${item.college || ''}"`,
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
}
