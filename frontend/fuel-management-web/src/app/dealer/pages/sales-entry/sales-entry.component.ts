import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

interface SaleReceipt {
  readonly receiptNumber: string;
  readonly issuedAt: string;
  readonly pump: string;
  readonly fuelType: string;
  readonly quantityLitres: number;
  readonly totalAmountInInr: number;
  readonly vehicleNumber: string;
  readonly paymentMethod: string;
  readonly reference?: string;
  readonly customerPhone?: string;
}

@Component({
  selector: 'app-sales-entry',
  templateUrl: './sales-entry.component.html',
  styleUrl: './sales-entry.component.scss'
})
export class SalesEntryComponent {
  readonly pumps = [
    { id: 'pump-01', name: 'Pump 01', fuelType: 'Petrol' },
    { id: 'pump-02', name: 'Pump 02', fuelType: 'Diesel' },
    { id: 'pump-03', name: 'Pump 03', fuelType: 'CNG' },
  ];

  readonly paymentMethods = ['Cash', 'UPI', 'Card', 'Fleet Card'];
  readonly quickAmounts = [100, 200, 500, 1000, 3000];
  readonly currentPricePerLitre = 97.45;
  readonly availableStockLitres = 2200;

  stockWarning = '';
  customerLookupName = '';
  submitSuccess = '';
  lastReceipt: SaleReceipt | null = null;

  readonly form = this.fb.group({
    pumpId: ['pump-01', [Validators.required]],
    fuelType: ['Petrol', [Validators.required]],
    quantityLitres: [0, [Validators.required, Validators.min(0.1)]],
    totalAmount: [0, [Validators.required, Validators.min(1)]],
    vehicleNumber: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/)]],
    paymentMethod: ['Cash', [Validators.required]],
    reference: [''],
    customerPhone: [''],
  });

  constructor(private readonly fb: FormBuilder) {
    this.form.controls.pumpId.valueChanges.subscribe((pumpId) => {
      const matched = this.pumps.find((pump) => pump.id === pumpId);
      if (matched) {
        this.form.patchValue({ fuelType: matched.fuelType }, { emitEvent: false });
      }
    });

    this.form.controls.quantityLitres.valueChanges.subscribe((quantity) => {
      const parsed = Number(quantity ?? 0);
      if (parsed <= 0) {
        return;
      }

      this.form.patchValue({ totalAmount: Number((parsed * this.currentPricePerLitre).toFixed(2)) }, { emitEvent: false });
      this.checkStock(parsed);
    });

    this.form.controls.totalAmount.valueChanges.subscribe((amount) => {
      const parsed = Number(amount ?? 0);
      if (parsed <= 0) {
        return;
      }

      const litres = parsed / this.currentPricePerLitre;
      this.form.patchValue({ quantityLitres: Number(litres.toFixed(2)) }, { emitEvent: false });
      this.checkStock(litres);
    });

    this.form.controls.paymentMethod.valueChanges.subscribe((method) => {
      if (method === 'Cash') {
        this.form.controls.reference.clearValidators();
      } else {
        this.form.controls.reference.setValidators([Validators.required, Validators.minLength(6)]);
      }
      this.form.controls.reference.updateValueAndValidity();
    });
  }

  applyQuickAmount(amount: number): void {
    this.form.patchValue({ totalAmount: amount });
  }

  lookupCustomer(): void {
    const phone = this.form.controls.customerPhone.value?.trim();
    if (!phone) {
      this.customerLookupName = '';
      return;
    }

    this.customerLookupName = phone === '9876543210' ? 'Aarav Nair (Loyal Customer)' : 'No customer found';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const now = new Date();
    const matchedPump = this.pumps.find((pump) => pump.id === value.pumpId);
    const receipt: SaleReceipt = {
      receiptNumber: `REC-${now.getTime()}`,
      issuedAt: now.toLocaleString(),
      pump: matchedPump?.name ?? value.pumpId ?? 'Pump',
      fuelType: value.fuelType ?? '',
      quantityLitres: Number(value.quantityLitres ?? 0),
      totalAmountInInr: Number(value.totalAmount ?? 0),
      vehicleNumber: value.vehicleNumber ?? '',
      paymentMethod: value.paymentMethod ?? '',
      reference: value.reference ?? undefined,
      customerPhone: value.customerPhone ?? undefined,
    };

    this.lastReceipt = receipt;
    localStorage.setItem('fuel.last.sale.receipt', JSON.stringify(receipt));
    this.submitSuccess = 'Transaction recorded and receipt generated for printing.';

    setTimeout(() => {
      window.print();
    }, 250);
  }

  private checkStock(quantity: number): void {
    this.stockWarning = quantity > this.availableStockLitres ? 'Requested quantity exceeds available stock.' : '';
  }

}
