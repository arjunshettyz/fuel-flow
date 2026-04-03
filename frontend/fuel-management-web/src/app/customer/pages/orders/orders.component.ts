import { Component } from '@angular/core';

type OrderStatus = 'Requested' | 'Confirmed' | 'Dispatched' | 'Delivered';

interface FuelOrder {
  id: string;
  station: string;
  fuelType: string;
  quantity: number;
  status: OrderStatus;
  deliveryWindow: string;
  requestedAt: string;
  eta: string;
  lastUpdate: string;
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
export class OrdersComponent {
  readonly statusSteps: OrderStatus[] = ['Requested', 'Confirmed', 'Dispatched', 'Delivered'];

  orders: FuelOrder[] = [
    {
      id: 'ORD-2403',
      station: 'MG Road Fuel Hub',
      fuelType: 'Petrol',
      quantity: 750,
      status: 'Dispatched',
      deliveryWindow: 'Within 3 hours',
      requestedAt: '02 Apr, 10:20',
      eta: 'Today, 13:10',
      lastUpdate: 'Driver assigned · KA-01-FM-2026',
    },
    {
      id: 'ORD-2394',
      station: 'HSR Sector 2',
      fuelType: 'Diesel',
      quantity: 520,
      status: 'Confirmed',
      deliveryWindow: 'Today, 6-8 PM',
      requestedAt: '01 Apr, 18:40',
      eta: 'Today, 18:45',
      lastUpdate: 'Depot confirmed stock allocation',
    },
    {
      id: 'ORD-2388',
      station: 'Indiranagar 100ft',
      fuelType: 'CNG',
      quantity: 320,
      status: 'Requested',
      deliveryWindow: 'Tomorrow, 8-10 AM',
      requestedAt: '01 Apr, 09:05',
      eta: 'Tomorrow, 09:00',
      lastUpdate: 'Waiting on vendor confirmation',
    },
  ];

  activeOrderId = this.orders[0]?.id ?? '';

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

  get activeOrder(): FuelOrder | undefined {
    return this.orders.find((order) => order.id === this.activeOrderId);
  }

  placeOrder(): void {
    const now = new Date();
    const newId = `ORD-${Math.floor(2000 + Math.random() * 6000)}`;

    const order: FuelOrder = {
      id: newId,
      station: this.newOrder.station,
      fuelType: this.newOrder.fuelType,
      quantity: this.newOrder.quantity,
      status: 'Requested',
      deliveryWindow: this.newOrder.deliveryWindow,
      requestedAt: now.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      eta: this.newOrder.deliveryWindow,
      lastUpdate: 'Order submitted to dispatch',
    };

    this.orders = [order, ...this.orders];
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

    order.status = this.updateForm.status;
    order.quantity = this.updateForm.quantity;
    order.deliveryWindow = this.updateForm.deliveryWindow;
    order.eta = this.updateForm.deliveryWindow;
    order.lastUpdate = this.updateForm.notes
      ? `Customer update: ${this.updateForm.notes}`
      : `Status updated to ${this.updateForm.status}`;
  }

  stepIndex(status: OrderStatus): number {
    return this.statusSteps.indexOf(status);
  }
}
