export type OrderStatus = 'Requested' | 'Confirmed' | 'Dispatched' | 'Delivered';

export interface FuelOrder {
  id: string;
  station: string;
  fuelType: string;
  quantity: number;
  status: OrderStatus;
  deliveryWindow: string;
  requestedAt: string;
  eta: string;
  lastUpdate: string;

  customerId?: string;
  customerName?: string;
  customerEmail?: string;

  createdAtIso?: string;
  updatedAtIso?: string;
}
