import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { PumpManagerComponent } from './pages/pump-manager/pump-manager.component';
import { SalesEntryComponent } from './pages/sales-entry/sales-entry.component';
import { ShiftSummaryComponent } from './pages/shift-summary/shift-summary.component';

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
    path: 'sales/new',
    component: SalesEntryComponent,
  },
  {
    path: 'inventory',
    component: InventoryComponent,
  },
  {
    path: 'pumps',
    component: PumpManagerComponent,
  },
  {
    path: 'shift-summary',
    component: ShiftSummaryComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DealerRoutingModule { }
