import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NearbyStationsComponent } from './pages/nearby-stations/nearby-stations.component';
import { PricesComponent } from './pages/prices/prices.component';
import { ReceiptViewerComponent } from './pages/receipt-viewer/receipt-viewer.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { OrdersComponent } from './pages/orders/orders.component';

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
    path: 'prices',
    component: PricesComponent,
  },
  {
    path: 'transactions',
    component: TransactionsComponent,
  },
  {
    path: 'orders',
    component: OrdersComponent,
  },
  {
    path: 'receipts',
    component: ReceiptViewerComponent,
  },
  {
    path: 'stations',
    component: NearbyStationsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule { }
