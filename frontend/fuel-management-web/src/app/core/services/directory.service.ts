import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserProfile, UserRole } from '../models/auth.models';

export interface DirectoryUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'Active' | 'Locked';
  lastLogin: string;
}

export interface DirectoryStation {
  id: string;
  code: string;
  name: string;
  city: string;
  dealerName: string;
  activePumps: number;
  stockHealth: 'Green' | 'Yellow' | 'Red';
  active: boolean;
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly usersKey = 'fuel.directory.users';
  private readonly stationsKey = 'fuel.directory.stations';

  private readonly usersSubject = new BehaviorSubject<DirectoryUser[]>(this.readUsers());
  private readonly stationsSubject = new BehaviorSubject<DirectoryStation[]>(this.readStations());

  readonly users$ = this.usersSubject.asObservable();
  readonly stations$ = this.stationsSubject.asObservable();

  getUsersSnapshot(): DirectoryUser[] {
    return this.usersSubject.value;
  }

  getStationsSnapshot(): DirectoryStation[] {
    return this.stationsSubject.value;
  }

  searchUsers(query: string, roles?: UserRole[]): DirectoryUser[] {
    const normalized = query.trim().toLowerCase();
    const users = this.getUsersSnapshot();
    const scoped = roles?.length ? users.filter((u) => roles.includes(u.role)) : users;

    if (!normalized) {
      return scoped;
    }

    return scoped.filter((u) =>
      [u.fullName, u.email, u.phone, u.role].some((field) => field.toLowerCase().includes(normalized))
    );
  }

  saveUser(user: DirectoryUser): void {
    const users = [...this.getUsersSnapshot()];
    const index = users.findIndex((x) => x.id === user.id);
    if (index >= 0) {
      users[index] = { ...user };
    } else {
      users.unshift({ ...user });
    }
    this.commitUsers(users);
  }

  updateUserStatus(userId: string, status: 'Active' | 'Locked'): void {
    this.commitUsers(this.getUsersSnapshot().map((u) => (u.id === userId ? { ...u, status } : u)));
  }

  updateUserRole(userId: string, role: UserRole): void {
    this.commitUsers(this.getUsersSnapshot().map((u) => (u.id === userId ? { ...u, role } : u)));
  }

  updateOwnProfile(userId: string, payload: { fullName: string; email: string; phone: string }): DirectoryUser | null {
    let updated: DirectoryUser | null = null;
    const users = this.getUsersSnapshot().map((u) => {
      if (u.id !== userId) {
        return u;
      }
      updated = {
        ...u,
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.trim(),
      };
      return updated;
    });

    this.commitUsers(users);
    return updated;
  }

  syncSessionUser(user: UserProfile): void {
    const users = this.getUsersSnapshot();
    if (users.some((u) => u.id === user.id)) {
      return;
    }

    this.saveUser({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.isActive ? 'Active' : 'Locked',
      lastLogin: 'Just now',
    });
  }

  saveStation(station: DirectoryStation): void {
    const stations = [...this.getStationsSnapshot()];
    const index = stations.findIndex((x) => x.id === station.id);
    if (index >= 0) {
      stations[index] = { ...station };
    } else {
      stations.unshift({ ...station });
    }
    this.commitStations(stations);
  }

  toggleStation(stationId: string): void {
    this.commitStations(
      this.getStationsSnapshot().map((s) => (s.id === stationId ? { ...s, active: !s.active } : s))
    );
  }

  private commitUsers(users: DirectoryUser[]): void {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    this.usersSubject.next(users);
  }

  private commitStations(stations: DirectoryStation[]): void {
    localStorage.setItem(this.stationsKey, JSON.stringify(stations));
    this.stationsSubject.next(stations);
  }

  private readUsers(): DirectoryUser[] {
    const defaults: DirectoryUser[] = [
      {
        id: 'u-admin-01',
        fullName: 'Admin User',
        email: 'admin@demo.com',
        phone: '9000000001',
        role: 'Admin',
        status: 'Active',
        lastLogin: 'Today 10:40',
      },
      {
        id: 'u-dealer-01',
        fullName: 'Aarav Nair',
        email: 'aarav@demo.com',
        phone: '9876543210',
        role: 'Dealer',
        status: 'Active',
        lastLogin: 'Today 10:04',
      },
      {
        id: 'u-customer-01',
        fullName: 'Sneha Iyer',
        email: 'sneha@demo.com',
        phone: '9876501111',
        role: 'Customer',
        status: 'Active',
        lastLogin: 'Today 09:21',
      },
      {
        id: 'u-dealer-02',
        fullName: 'Manoj Rao',
        email: 'manoj@demo.com',
        phone: '9898002000',
        role: 'Dealer',
        status: 'Locked',
        lastLogin: '27 Mar 18:10',
      },
      {
        id: 'u-customer-02',
        fullName: 'Priya Das',
        email: 'priya@demo.com',
        phone: '9888801234',
        role: 'Customer',
        status: 'Active',
        lastLogin: 'Today 08:52',
      },
    ];

    const raw = localStorage.getItem(this.usersKey);
    if (!raw) {
      return defaults;
    }

    try {
      const parsed = JSON.parse(raw) as DirectoryUser[];
      return parsed?.length ? parsed : defaults;
    } catch {
      return defaults;
    }
  }

  private readStations(): DirectoryStation[] {
    const defaults: DirectoryStation[] = [
      {
        id: 's-001',
        code: 'KA-12',
        name: 'MG Road Fuel Hub',
        city: 'Bengaluru',
        dealerName: 'Aarav Nair',
        activePumps: 4,
        stockHealth: 'Green',
        active: true,
        lat: 12.9742,
        lng: 77.6063,
      },
      {
        id: 's-002',
        code: 'KA-22',
        name: 'HSR Sector 2',
        city: 'Bengaluru',
        dealerName: 'Sneha Pai',
        activePumps: 3,
        stockHealth: 'Yellow',
        active: true,
        lat: 12.9116,
        lng: 77.6474,
      },
      {
        id: 's-003',
        code: 'KA-08',
        name: 'Indiranagar 100ft',
        city: 'Bengaluru',
        dealerName: 'Manoj Rao',
        activePumps: 5,
        stockHealth: 'Red',
        active: false,
        lat: 12.9784,
        lng: 77.6408,
      },
    ];

    const raw = localStorage.getItem(this.stationsKey);
    if (!raw) {
      return defaults;
    }

    try {
      const parsed = JSON.parse(raw) as DirectoryStation[];
      return parsed?.length ? parsed : defaults;
    } catch {
      return defaults;
    }
  }
}
