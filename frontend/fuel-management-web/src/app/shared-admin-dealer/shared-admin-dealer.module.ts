import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TankGaugeComponent } from './components/tank-gauge/tank-gauge.component';
import { StationMapComponent } from './components/station-map/station-map.component';
import { RecentTransactionsComponent } from './components/recent-transactions/recent-transactions.component';
import { SharedModule } from '../shared/shared.module';



@NgModule({
  declarations: [
    TankGaugeComponent,
    StationMapComponent,
    RecentTransactionsComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
  ],
  exports: [
    SharedModule,
    TankGaugeComponent,
    StationMapComponent,
    RecentTransactionsComponent,
  ],
})
export class SharedAdminDealerModule { }
