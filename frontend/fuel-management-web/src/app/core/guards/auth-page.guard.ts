import { Injectable } from '@angular/core';
import { CanActivateChild, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthPageGuard implements CanActivateChild {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivateChild(): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) {
      return true;
    }

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.auth.clearSession();
      return true;
    }

    return this.router.parseUrl(this.auth.routeForRole(currentUser.role));
  }
}
