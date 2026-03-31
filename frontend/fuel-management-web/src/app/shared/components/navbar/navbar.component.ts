import { Component, HostListener, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { UserProfile } from "../../../core/models/auth.models";

@Component({
  selector: "app-navbar",
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss"
})
export class NavbarComponent implements OnInit {
  user: UserProfile | null = null;
  scrolled = false;
  mobileOpen = false;
  userMenuOpen = false;

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit(): void { this.auth.currentUser$.subscribe(u => this.user = u); }

  @HostListener("window:scroll")
  onScroll(): void { this.scrolled = window.scrollY > 20; }

  get navLinks(): { label: string; path: string }[] {
    if (!this.user) return [];
    if (this.user.role === "Admin") return [
      { label: "Dashboard", path: "/admin/dashboard" },
      { label: "Stations",  path: "/admin/stations" },
      { label: "Users",     path: "/admin/users" },
      { label: "Prices",    path: "/admin/prices" },
      { label: "Reports",   path: "/admin/reports" },
      { label: "Fraud",     path: "/admin/fraud" }
    ];
    if (this.user.role === "Dealer") return [
      { label: "Dashboard", path: "/dealer/dashboard" },
      { label: "New Sale",  path: "/dealer/sales/new" },
      { label: "Inventory", path: "/dealer/inventory" },
      { label: "Pumps",     path: "/dealer/pumps" },
      { label: "Shift",     path: "/dealer/shift-summary" }
    ];
    return [
      { label: "Dashboard",    path: "/customer/dashboard" },
      { label: "Prices",       path: "/customer/prices" },
      { label: "Transactions", path: "/customer/transactions" },
      { label: "Stations",     path: "/customer/stations" },
      { label: "Receipts",     path: "/customer/receipts" }
    ];
  }

  get roleLabel(): string { return this.user?.role ?? ""; }

  toggleMobile(): void { this.mobileOpen = !this.mobileOpen; }
  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; }
  closeMobile(): void { this.mobileOpen = false; this.userMenuOpen = false; }

  logout(): void {
    this.userMenuOpen = false; this.mobileOpen = false;
    this.auth.logout().subscribe(() => this.router.navigateByUrl("/auth/login"));
  }
}
