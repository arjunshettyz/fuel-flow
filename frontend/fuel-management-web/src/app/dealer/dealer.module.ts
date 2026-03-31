import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DealerRoutingModule } from './dealer-routing.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SalesEntryComponent } from './pages/sales-entry/sales-entry.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { PumpManagerComponent } from './pages/pump-manager/pump-manager.component';
import { ShiftSummaryComponent } from './pages/shift-summary/shift-summary.component';
import { SharedModule } from '../shared/shared.module';
import { SharedAdminDealerModule } from '../shared-admin-dealer/shared-admin-dealer.module';


@NgModule({
  declarations: [
    DashboardComponent,
    SalesEntryComponent,
    InventoryComponent,
    PumpManagerComponent,
    ShiftSummaryComponent
  ],
  imports: [
    CommonModule,
    DealerRoutingModule,
    SharedModule,
    SharedAdminDealerModule,
  ]
})
export class DealerModule { }
