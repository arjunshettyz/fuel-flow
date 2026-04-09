import { Component, ElementRef, HostListener, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import { UserProfile } from "../../../core/models/auth.models";

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: "app-navbar",
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss"
})
export class NavbarComponent implements OnInit, OnDestroy {
  user: UserProfile | null = null;
  scrolled = false;
  mobileOpen = false;
  userMenuOpen = false;
  userInitial = "";
  userFirstName = "";
  roleLabel = "";
  navLinks: NavLink[] = [];

  private readonly adminLinks: NavLink[] = [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Stations", path: "/admin/stations" },
    { label: "Users", path: "/admin/users" },
    { label: "Prices", path: "/admin/prices" },
    { label: "Customer Orders", path: "/admin/customer-orders" },
    { label: "Reports", path: "/admin/reports" },
    { label: "Fraud", path: "/admin/fraud" }
  ];

  private readonly dealerLinks: NavLink[] = [
    { label: "Dashboard", path: "/dealer/dashboard" },
    { label: "New Sale", path: "/dealer/sales/new" },
    { label: "Inventory", path: "/dealer/inventory" },
    { label: "Customer Orders", path: "/dealer/customer-orders" },
    { label: "Pumps", path: "/dealer/pumps" },
    { label: "Shift", path: "/dealer/shift-summary" }
  ];

  private readonly customerLinks: NavLink[] = [
    { label: "Dashboard", path: "/customer/dashboard" },
    { label: "Prices", path: "/customer/prices" },
    { label: "Orders", path: "/customer/orders" },
    { label: "Transactions", path: "/customer/transactions" },
    { label: "Stations", path: "/customer/stations" },
    { label: "Receipts", path: "/customer/receipts" }
  ];

  private userSub?: Subscription;

  readonly publicLinks = [
    { label: "Platform", fragment: "platform" },
    { label: "Fuel Solutions", fragment: "solutions" },
    { label: "Who We Serve", fragment: "benefits" },
    { label: "Pricing", fragment: "pricing" },
  ];

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly hostRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.userSub = this.auth.currentUser$.subscribe((u) => {
      this.user = u;
      this.updateUserUiState();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  @HostListener("window:scroll")
  onScroll(): void { this.scrolled = window.scrollY > 20; }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.userMenuOpen = false;
      this.mobileOpen = false;
    }
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.userMenuOpen = false;
    this.mobileOpen = false;
  }

  toggleMobile(): void { this.mobileOpen = !this.mobileOpen; }
  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; }
  closeMobile(): void { this.mobileOpen = false; this.userMenuOpen = false; }

  trackByPath(_: number, link: NavLink): string { return link.path; }
  trackByFragment(_: number, link: { label: string; fragment: string }): string { return link.fragment; }

  logout(): void {
    this.userMenuOpen = false; this.mobileOpen = false;
    this.auth.logout().subscribe(() => this.router.navigateByUrl("/auth/login"));
  }

  private updateUserUiState(): void {
    if (!this.user) {
      this.navLinks = [];
      this.userInitial = "";
      this.userFirstName = "";
      this.roleLabel = "";
      return;
    }

    this.roleLabel = this.user.role;
    this.userInitial = this.user.fullName.charAt(0).toUpperCase();
    this.userFirstName = this.user.fullName.split(" ")[0];

    if (this.user.role === "Admin") {
      this.navLinks = this.adminLinks;
      return;
    }

    if (this.user.role === "Dealer") {
      this.navLinks = this.dealerLinks;
      return;
    }

    this.navLinks = this.customerLinks;
  }
}
