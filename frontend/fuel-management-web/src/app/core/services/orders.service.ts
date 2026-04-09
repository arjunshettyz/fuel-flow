import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FuelOrder, OrderStatus } from '../models/orders.models';

export interface PlaceOrderRequest {
  station: string;
  fuelType: string;
  quantity: number;
  deliveryWindow: string;
  notes?: string;
  customer?: {
    id: string;
    fullName: string;
    email: string;
  };
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly storageKey = 'fuel.orders.v1';
  private readonly ordersSubject = new BehaviorSubject<FuelOrder[]>(this.loadInitialOrders());
  readonly orders$ = this.ordersSubject.asObservable();

  getSnapshot(): FuelOrder[] {
    return this.ordersSubject.value;
  }

  placeOrder(request: PlaceOrderRequest): FuelOrder {
    const now = new Date();
    const orderId = this.generateOrderId();
    const requestedAt = now.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const notes = request.notes?.trim();

    const order: FuelOrder = {
      id: orderId,
      station: request.station,
      fuelType: request.fuelType,
      quantity: request.quantity,
      status: 'Requested',
      deliveryWindow: request.deliveryWindow,
      requestedAt,
      eta: request.deliveryWindow,
      lastUpdate: notes ? `Customer note: ${notes}` : 'Order submitted to dispatch',
      customerId: request.customer?.id,
      customerName: request.customer?.fullName,
      customerEmail: request.customer?.email,
      createdAtIso: now.toISOString(),
      updatedAtIso: now.toISOString(),
    };

    const next = [order, ...this.getSnapshot()];
    this.commit(next);
    return order;
  }

  updateOrder(orderId: string, update: Partial<FuelOrder>): FuelOrder | null {
    const current = this.getSnapshot();
    const index = current.findIndex((item) => item.id === orderId);
    if (index < 0) {
      return null;
    }

    const existing = current[index];
    const nextUpdate: Partial<FuelOrder> = { ...update };

    if (typeof nextUpdate.deliveryWindow === 'string' && typeof nextUpdate.eta !== 'string') {
      nextUpdate.eta = nextUpdate.deliveryWindow;
    }

    const updated: FuelOrder = {
      ...existing,
      ...nextUpdate,
      updatedAtIso: new Date().toISOString(),
    };

    const next = [...current];
    next[index] = updated;
    this.commit(next);
    return updated;
  }

  private commit(orders: FuelOrder[]): void {
    this.ordersSubject.next(orders);
    this.safeSetItem(this.storageKey, JSON.stringify(orders));
  }

  private loadInitialOrders(): FuelOrder[] {
    const stored = this.readStoredOrders();
    if (stored?.length) {
      return stored;
    }

    const seed = this.seedOrders();
    this.safeSetItem(this.storageKey, JSON.stringify(seed));
    return seed;
  }

  private readStoredOrders(): FuelOrder[] | null {
    const raw = this.safeGetItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return null;
      }

      const orders = parsed.filter(this.isFuelOrder);
      return orders.length ? orders : null;
    } catch {
      return null;
    }
  }

  private seedOrders(): FuelOrder[] {
    const nowIso = new Date().toISOString();

    return [
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
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
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
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
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
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      },
    ];
  }

  private generateOrderId(): string {
    const nonce = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${nonce}`;
  }

  private safeGetItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures (e.g., restricted browser modes).
    }
  }

  private isFuelOrder = (candidate: unknown): candidate is FuelOrder => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }

    const record = candidate as Record<string, unknown>;

    return (
      typeof record['id'] === 'string' &&
      typeof record['station'] === 'string' &&
      typeof record['fuelType'] === 'string' &&
      typeof record['quantity'] === 'number' &&
      typeof record['status'] === 'string' &&
      typeof record['deliveryWindow'] === 'string' &&
      typeof record['requestedAt'] === 'string' &&
      typeof record['eta'] === 'string' &&
      typeof record['lastUpdate'] === 'string' &&
      this.isOrderStatus(record['status'])
    );
  };

  private isOrderStatus(status: unknown): status is OrderStatus {
    return status === 'Requested' || status === 'Confirmed' || status === 'Dispatched' || status === 'Delivered';
  }
}
