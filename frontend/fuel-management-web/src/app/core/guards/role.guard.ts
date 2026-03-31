import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const requiredRole = route.data['role'] as string | undefined;
    if (!requiredRole) {
      return true;
    }

    if (this.auth.hasRole(requiredRole)) {
      return true;
    }

    const currentUser = this.auth.getCurrentUser();
    if (currentUser) {
      return this.router.parseUrl(this.auth.routeForRole(currentUser.role));
    }

    return this.router.parseUrl('/auth/login');
  }
}
