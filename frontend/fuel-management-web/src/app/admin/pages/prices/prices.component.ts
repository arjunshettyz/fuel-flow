import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../environments/environment';
import { FuelPricesService } from '../../../core/services/fuel-prices.service';

interface PriceHistoryRow {
  fuelType: string;
  oldPrice: number;
  newPrice: number;
  effectiveAt: string;
  changedBy: string;
}

@Component({
  selector: 'app-prices',
  templateUrl: './prices.component.html',
  styleUrl: './prices.component.scss'
})
export class PricesComponent implements OnInit {
  currentPrices = [
    { fuelType: 'Petrol', price: 97.45, effectiveDate: '29 Mar 2026 06:00' },
    { fuelType: 'Diesel', price: 89.1, effectiveDate: '29 Mar 2026 06:00' },
    { fuelType: 'CNG', price: 78.25, effectiveDate: '29 Mar 2026 06:00' },
    { fuelType: 'Premium Petrol', price: 105.7, effectiveDate: '29 Mar 2026 06:00' },
  ];

  history: PriceHistoryRow[] = [
    { fuelType: 'Petrol', oldPrice: 97.1, newPrice: 97.45, effectiveAt: '29 Mar 2026 06:00', changedBy: 'Admin: Meera' },
    { fuelType: 'Diesel', oldPrice: 89.3, newPrice: 89.1, effectiveAt: '29 Mar 2026 06:00', changedBy: 'Admin: Meera' },
    { fuelType: 'CNG', oldPrice: 78.0, newPrice: 78.25, effectiveAt: '29 Mar 2026 06:00', changedBy: 'Admin: Meera' },
  ];

  selectedFuelType = 'Petrol';
  newPricePerLitre: number | null = null;
  effectiveAt = '';

  isSaving = false;
  saveMessage = '';
  saveError = '';

  constructor(
    private readonly http: HttpClient,
    private readonly fuelPrices: FuelPricesService,
    private readonly destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.fuelPrices.ensureLoaded();

    this.fuelPrices.prices$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        if (!Array.isArray(items) || items.length === 0) {
          return;
        }

        this.currentPrices = items.map((x) => {
          const when = x.updatedAt ? new Date(x.updatedAt).toLocaleString() : '';
          return {
            fuelType: x.fuelType,
            price: x.pricePerLitre,
            effectiveDate: when,
          };
        });
      });
  }

  scrollToUpdateForm(): void {
    document.querySelector('.update-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  savePrice(): void {
    this.saveMessage = '';
    this.saveError = '';

    const fuelType = (this.selectedFuelType || '').trim();
    const price = Number(this.newPricePerLitre);

    if (!fuelType) {
      this.saveError = 'Fuel type is required.';
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      this.saveError = 'Enter a valid price.';
      return;
    }

    const currentRow = this.currentPrices.find((x) => x.fuelType === fuelType);
    const oldPrice = currentRow?.price ?? price;

    this.isSaving = true;
    this.http
      .put<{ updated: number; fuelType: string; pricePerLitre: number; updatedAt: string }>(
        `${environment.apiBaseUrl}/gateway/inventory/tanks/prices/bulk`,
        {
          fuelType,
          pricePerLitre: price,
        }
      )
      .subscribe({
        next: (resp) => {
          const updatedAt = resp.updatedAt ? new Date(resp.updatedAt) : new Date();
          const when = updatedAt.toLocaleString();

          this.fuelPrices.applyServerUpdate(resp);

          this.history.unshift({
            fuelType: resp.fuelType,
            oldPrice,
            newPrice: resp.pricePerLitre,
            effectiveAt: when,
            changedBy: 'Admin: You',
          });

          this.saveMessage = `Updated ${resp.updated} tanks for ${resp.fuelType}.`;
          this.isSaving = false;
        },
        error: (error: unknown) => {
          this.saveError = error instanceof Error ? error.message : 'Failed to update price.';
          this.isSaving = false;
        },
      });
  }

}
