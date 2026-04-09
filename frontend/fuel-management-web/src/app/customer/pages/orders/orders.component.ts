import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FuelOrder, OrderStatus } from '../../../core/models/orders.models';
import { AuthService } from '../../../core/services/auth.service';
import { OrdersService } from '../../../core/services/orders.service';
import { PaymentService, RazorpayOrderResponse } from '../../../core/services/payment.service';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface NewOrderForm {
  station: string;
  fuelType: string;
  quantity: number;
  deliveryWindow: string;
  notes: string;
}

interface OrderUpdateForm {
  status: OrderStatus;
  quantity: number;
  deliveryWindow: string;
  notes: string;
}

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit, OnDestroy {
  readonly statusSteps: OrderStatus[] = ['Requested', 'Confirmed', 'Dispatched', 'Delivered'];

  orders: FuelOrder[] = [];
  activeOrderId = '';

  newOrder: NewOrderForm = {
    station: 'MG Road Fuel Hub',
    fuelType: 'Petrol',
    quantity: 500,
    deliveryWindow: 'Within 2 hours',
    notes: '',
  };

  updateForm: OrderUpdateForm = {
    status: 'Requested',
    quantity: 500,
    deliveryWindow: 'Within 2 hours',
    notes: '',
  };

  paymentMessage = '';
  isPaying = false;

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly paymentService: PaymentService,
    private readonly ordersService: OrdersService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.ordersService.orders$.subscribe((orders) => {
        this.orders = orders;

        const hasActive = !!this.activeOrderId && orders.some((order) => order.id === this.activeOrderId);
        if (!hasActive && orders.length) {
          this.selectOrder(orders[0].id);
        }
      })
    );

    this.subscriptions.add(
      this.route.fragment.subscribe((fragment) => {
        if (!fragment) {
          return;
        }

        setTimeout(() => {
          document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get activeOrder(): FuelOrder | undefined {
    return this.orders.find((order) => order.id === this.activeOrderId);
  }

  placeOrder(): void {
    const user = this.auth.getCurrentUser();
    const order = this.ordersService.placeOrder({
      station: this.newOrder.station,
      fuelType: this.newOrder.fuelType,
      quantity: this.newOrder.quantity,
      deliveryWindow: this.newOrder.deliveryWindow,
      notes: this.newOrder.notes,
      customer: user
        ? {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
          }
        : undefined,
    });

    this.activeOrderId = order.id;
    this.updateForm = {
      status: order.status,
      quantity: order.quantity,
      deliveryWindow: order.deliveryWindow,
      notes: '',
    };

    this.newOrder = {
      station: this.newOrder.station,
      fuelType: this.newOrder.fuelType,
      quantity: 500,
      deliveryWindow: 'Within 2 hours',
      notes: '',
    };
  }

  selectOrder(orderId: string): void {
    this.activeOrderId = orderId;
    const order = this.activeOrder;
    if (!order) {
      return;
    }

    this.updateForm = {
      status: order.status,
      quantity: order.quantity,
      deliveryWindow: order.deliveryWindow,
      notes: '',
    };
  }

  updateOrder(): void {
    const order = this.activeOrder;
    if (!order) {
      return;
    }

    const notes = this.updateForm.notes?.trim();
    this.ordersService.updateOrder(order.id, {
      status: this.updateForm.status,
      quantity: this.updateForm.quantity,
      deliveryWindow: this.updateForm.deliveryWindow,
      eta: this.updateForm.deliveryWindow,
      lastUpdate: notes ? `Customer update: ${notes}` : `Status updated to ${this.updateForm.status}`,
    });

    this.updateForm = {
      ...this.updateForm,
      notes: '',
    };
  }

  stepIndex(status: OrderStatus): number {
    return this.statusSteps.indexOf(status);
  }

  payForOrder(order: FuelOrder, event?: Event): void {
    event?.stopPropagation();
    if (this.isPaying) {
      return;
    }

    if (!window.Razorpay) {
      this.paymentMessage = 'Razorpay SDK failed to load. Refresh and try again.';
      return;
    }

    this.isPaying = true;
    this.paymentMessage = '';

    const estimatedAmount = Math.max(1, Math.round(order.quantity * 97.45));
    this.paymentService
      .createOrder({
        amount: estimatedAmount,
        currency: 'INR',
        receipt: `fuel_${order.id}`,
        notes: {
          orderId: order.id,
          station: order.station,
          fuelType: order.fuelType,
        },
      })
      .pipe(
        catchError((error) => {
          this.isPaying = false;
          this.paymentMessage = error?.error?.message || 'Unable to initiate Razorpay checkout.';
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.openCheckout(order, response);
      });
  }

  private openCheckout(order: FuelOrder, orderResponse: RazorpayOrderResponse): void {
    const RazorpayCtor = window.Razorpay;
    if (!RazorpayCtor) {
      this.isPaying = false;
      this.paymentMessage = 'Razorpay SDK failed to load. Refresh and try again.';
      return;
    }

    const razorpay = new RazorpayCtor({
      key: orderResponse.keyId,
      amount: orderResponse.amount,
      currency: orderResponse.currency,
      name: 'FuelFlow',
      description: `Fuel order ${order.id}`,
      order_id: orderResponse.orderId,
      prefill: {
        name: 'FuelFlow Customer',
      },
      notes: {
        station: order.station,
        fuelType: order.fuelType,
      },
      theme: {
        color: '#18b8b0',
      },
      handler: (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        this.paymentService.verifyPayment(payment).subscribe({
          next: () => {
            this.isPaying = false;
            this.paymentMessage = 'Payment successful and verified.';
            this.ordersService.updateOrder(order.id, {
              status: 'Confirmed',
              lastUpdate: `Payment verified: ${payment.razorpay_payment_id}`,
            });
          },
          error: (error) => {
            this.isPaying = false;
            this.paymentMessage = error?.error?.message || 'Payment completed but verification failed.';
          },
        });
      },
      modal: {
        ondismiss: () => {
          this.isPaying = false;
          this.paymentMessage = 'Payment cancelled.';
        },
      },
    });

    razorpay.open();
  }
}
