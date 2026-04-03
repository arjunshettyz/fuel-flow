import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CustomerRoutingModule } from './customer-routing.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PricesComponent } from './pages/prices/prices.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { ReceiptViewerComponent } from './pages/receipt-viewer/receipt-viewer.component';
import { NearbyStationsComponent } from './pages/nearby-stations/nearby-stations.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { SharedModule } from '../shared/shared.module';
import { SharedAdminDealerModule } from '../shared-admin-dealer/shared-admin-dealer.module';


@NgModule({
  declarations: [
    DashboardComponent,
    PricesComponent,
    TransactionsComponent,
    ReceiptViewerComponent,
    NearbyStationsComponent,
    OrdersComponent
  ],
  imports: [
    CommonModule,
    CustomerRoutingModule,
    SharedModule,
    SharedAdminDealerModule,
  ]
})
export class CustomerModule { }
