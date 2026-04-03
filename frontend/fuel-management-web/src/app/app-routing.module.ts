import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LandingComponent } from './landing/landing.component';
import { RoleGuard } from './core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'customer',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'customer' },
    loadChildren: () => import('./customer/customer.module').then((m) => m.CustomerModule),
  },
  {
    path: 'dealer',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'dealer' },
    loadChildren: () => import('./dealer/dealer.module').then((m) => m.DealerModule),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'admin' },
    loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'enabled',
      scrollOffset: [0, 88],
    }),
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
