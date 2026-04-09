import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FuelOrder, OrderStatus } from '../../../core/models/orders.models';
import { AuthService } from '../../../core/services/auth.service';
import { OrdersService } from '../../../core/services/orders.service';
import { UserProfile } from '../../../core/models/auth.models';

interface OrderUpdateForm {
  status: OrderStatus;
  eta: string;
  notes: string;
}

@Component({
  selector: 'app-customer-orders-manager',
  templateUrl: './customer-orders-manager.component.html',
  styleUrl: './customer-orders-manager.component.scss',
})
export class CustomerOrdersManagerComponent implements OnInit, OnDestroy {
  readonly statusSteps: OrderStatus[] = ['Requested', 'Confirmed', 'Dispatched', 'Delivered'];

  user: UserProfile | null = null;
  orders: FuelOrder[] = [];
  activeOrderId = '';

  updateForm: OrderUpdateForm = {
    status: 'Requested',
    eta: '',
    notes: '',
  };

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly ordersService: OrdersService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.auth.currentUser$.subscribe((user) => {
        this.user = user;
      })
    );

    this.subscriptions.add(
      this.ordersService.orders$.subscribe((orders) => {
        this.orders = orders;

        const hasActive = !!this.activeOrderId && orders.some((order) => order.id === this.activeOrderId);
        if (!hasActive && orders.length) {
          this.selectOrder(orders[0].id);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get dashboardLink(): string {
    const role = this.user?.role;
    if (role === 'Admin') {
      return '/admin/dashboard';
    }

    return '/dealer/dashboard';
  }

  get activeOrder(): FuelOrder | undefined {
    return this.orders.find((order) => order.id === this.activeOrderId);
  }

  selectOrder(orderId: string): void {
    this.activeOrderId = orderId;
    const order = this.activeOrder;
    if (!order) {
      return;
    }

    this.updateForm = {
      status: order.status,
      eta: order.eta,
      notes: '',
    };
  }

  stepIndex(status: OrderStatus): number {
    return this.statusSteps.indexOf(status);
  }

  saveUpdate(): void {
    const order = this.activeOrder;
    if (!order) {
      return;
    }

    const eta = this.updateForm.eta.trim();
    const notes = this.updateForm.notes.trim();
    const actorLabel = this.user?.role ?? 'Staff';

    const lastUpdate = notes ? `${actorLabel} update: ${notes}` : `Status updated to ${this.updateForm.status}`;

    const update: Partial<FuelOrder> = {
      status: this.updateForm.status,
      lastUpdate,
    };

    if (eta) {
      update.eta = eta;
      update.deliveryWindow = eta;
    }

    this.ordersService.updateOrder(order.id, update);

    this.updateForm = {
      ...this.updateForm,
      notes: '',
    };
  }
}
