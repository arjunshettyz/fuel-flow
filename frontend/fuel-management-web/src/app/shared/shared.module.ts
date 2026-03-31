import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LanguageToggleComponent } from './components/language-toggle/language-toggle.component';
import { PriceTickerComponent } from './components/price-ticker/price-ticker.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';

@NgModule({
  declarations: [LanguageToggleComponent, PriceTickerComponent, KpiCardComponent, NavbarComponent, FooterComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LanguageToggleComponent, PriceTickerComponent, KpiCardComponent, NavbarComponent, FooterComponent]
})
export class SharedModule {}