import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FuelPriceSnapshot {
  fuelType: string;
  pricePerLitre: number;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class FuelPricesService {
  private readonly pricesSubject = new BehaviorSubject<FuelPriceSnapshot[]>(this.seed());
  readonly prices$ = this.pricesSubject.asObservable();

  private hasLoaded = false;
  private loading = false;

  constructor(private readonly http: HttpClient) {}

  getSnapshot(): FuelPriceSnapshot[] {
    return this.pricesSubject.value;
  }

  ensureLoaded(): void {
    if (this.hasLoaded || this.loading) {
      return;
    }

    this.refresh();
  }

  refresh(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.http.get<FuelPriceSnapshot[]>(`${environment.apiBaseUrl}/gateway/inventory/tanks/prices`).subscribe({
      next: (items) => {
        this.loading = false;
        if (!Array.isArray(items) || items.length === 0) {
          return;
        }
        this.pricesSubject.next(items);
        this.hasLoaded = true;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyServerUpdate(update: { fuelType: string; pricePerLitre: number; updatedAt?: string | null }): void {
    const fuelType = (update.fuelType ?? '').trim();
    const pricePerLitre = Number(update.pricePerLitre);

    if (!fuelType || !Number.isFinite(pricePerLitre)) {
      return;
    }

    const updatedAt = typeof update.updatedAt === 'string' && update.updatedAt ? update.updatedAt : new Date().toISOString();

    const nextItem: FuelPriceSnapshot = {
      fuelType,
      pricePerLitre,
      updatedAt,
    };

    const current = this.getSnapshot();
    const index = current.findIndex((x) => x.fuelType === fuelType);

    const next = [...current];
    if (index >= 0) {
      next[index] = nextItem;
    } else {
      next.unshift(nextItem);
    }

    this.pricesSubject.next(next);
    this.hasLoaded = true;
  }

  private seed(): FuelPriceSnapshot[] {
    const nowIso = new Date().toISOString();

    return [
      { fuelType: 'Petrol', pricePerLitre: 97.45, updatedAt: nowIso },
      { fuelType: 'Diesel', pricePerLitre: 89.1, updatedAt: nowIso },
      { fuelType: 'CNG', pricePerLitre: 78.25, updatedAt: nowIso },
      { fuelType: 'Premium Petrol', pricePerLitre: 105.7, updatedAt: nowIso },
      { fuelType: 'Premium Diesel', pricePerLitre: 96.9, updatedAt: nowIso },
    ];
  }
}
