import { Component } from '@angular/core';

interface UserRow {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'Active' | 'Locked';
  lastLogin: string;
}

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  users: UserRow[] = [
    { name: 'Aarav Nair', email: 'aarav@demo.com', phone: '9876543210', role: 'Dealer', status: 'Active', lastLogin: '29 Mar 10:04' },
    { name: 'Sneha Iyer', email: 'sneha@demo.com', phone: '9876501111', role: 'Customer', status: 'Active', lastLogin: '29 Mar 09:21' },
    { name: 'Rahul Das', email: 'rahul@demo.com', phone: '9898002000', role: 'Auditor', status: 'Locked', lastLogin: '27 Mar 18:10' },
  ];

  roleFilter = '';

  get filteredUsers(): UserRow[] {
    if (!this.roleFilter) {
      return this.users;
    }
    return this.users.filter((user) => user.role === this.roleFilter);
  }

  toggleStatus(user: UserRow): void {
    user.status = user.status === 'Active' ? 'Locked' : 'Active';
  }

}
