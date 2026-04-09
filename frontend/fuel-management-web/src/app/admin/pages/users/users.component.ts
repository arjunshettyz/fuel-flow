import { Component } from '@angular/core';
import { DirectoryService, DirectoryUser } from '../../../core/services/directory.service';
import { UserRole } from '../../../core/models/auth.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  users: DirectoryUser[] = [];
  roleFilter = '';
  search = '';
  selectedUser: DirectoryUser | null = null;
  actionMessage = '';

  constructor(private readonly directory: DirectoryService, private readonly router: Router) {
    this.directory.users$.subscribe((users) => {
      this.users = users;
    });
  }

  get totalDealers(): number {
    return this.users.filter((user) => user.role === 'Dealer').length;
  }

  get totalCustomers(): number {
    return this.users.filter((user) => user.role === 'Customer').length;
  }

  get filteredUsers(): DirectoryUser[] {
    const searched = this.directory.searchUsers(this.search, this.selectedRoles());
    if (!this.roleFilter) {
      return searched;
    }
    return searched.filter((user) => user.role === this.roleFilter);
  }

  toggleStatus(user: DirectoryUser): void {
    this.directory.updateUserStatus(user.id, user.status === 'Active' ? 'Locked' : 'Active');
  }

  updateRole(user: DirectoryUser, role: string): void {
    this.directory.updateUserRole(user.id, role as UserRole);
  }

  createUser(): void {
    this.router.navigate(['/auth/register']);
  }

  viewProfile(user: DirectoryUser): void {
    this.selectedUser = user;
    this.actionMessage = `Viewing profile: ${user.fullName}`;
  }

  deactivate(user: DirectoryUser): void {
    this.directory.updateUserStatus(user.id, 'Locked');
    this.selectedUser = this.selectedUser?.id === user.id ? { ...user, status: 'Locked' } : this.selectedUser;
    this.actionMessage = `${user.fullName} deactivated (locked).`;
  }

  private selectedRoles(): UserRole[] | undefined {
    return this.roleFilter ? [this.roleFilter as UserRole] : undefined;
  }

}
