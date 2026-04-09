import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { FraudComponent } from './pages/fraud/fraud.component';
import { PricesComponent } from './pages/prices/prices.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { StationsComponent } from './pages/stations/stations.component';
import { UsersComponent } from './pages/users/users.component';
import { CustomerOrdersManagerComponent } from '../shared-admin-dealer/components/customer-orders-manager/customer-orders-manager.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'users',
    component: UsersComponent,
  },
  {
    path: 'reports',
    component: ReportsComponent,
  },
  {
    path: 'fraud',
    component: FraudComponent,
  },
  {
    path: 'stations',
    component: StationsComponent,
  },
  {
    path: 'prices',
    component: PricesComponent,
  },
  {
    path: 'customer-orders',
    component: CustomerOrdersManagerComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
