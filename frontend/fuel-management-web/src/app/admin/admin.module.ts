import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { FraudComponent } from './pages/fraud/fraud.component';
import { StationsComponent } from './pages/stations/stations.component';
import { PricesComponent } from './pages/prices/prices.component';
import { SharedModule } from '../shared/shared.module';
import { SharedAdminDealerModule } from '../shared-admin-dealer/shared-admin-dealer.module';


@NgModule({
  declarations: [
    DashboardComponent,
    UsersComponent,
    ReportsComponent,
    FraudComponent,
    StationsComponent,
    PricesComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    SharedModule,
    SharedAdminDealerModule,
  ]
})
export class AdminModule { }
