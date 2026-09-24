export interface PriceConfig {
  currency: string;
  currencySymbol: string;
  rates: {
    bw: number; // e.g. 2.0 (Rs. 2 per page)
    color: number; // e.g. 10.0 (Rs. 10 per page)
    bw_single?: number;
    bw_double?: number;
    color_single?: number;
    color_double?: number;
  };
  rateBwSingle?: number;
  rateBwDouble?: number;
  rateColorSingle?: number;
  rateColorDouble?: number;
  rateSpiralBinding?: number;
  rateStapling?: number;
  paperSizes: {
    [key: string]: {
      name: string;
      extra: number;
      description?: string;
    };
  };
  payment_methods?: {
    enable_upi?: boolean;
    enable_cash?: boolean;
  };
  is_accepting_orders?: boolean;
  orders_paused?: boolean;
  duplexDiscount?: number;
  taxPercentage?: number;
}

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
}

export interface Shop {
  id: string;
  owner_id?: string;
  name: string;
  qr_code_slug: string;
  address?: string | null;
  price_config: PriceConfig;
  created_at?: string;
}

export interface Subscription {
  id: string;
  shop_id: string;
  plan: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  gateway_subscription_id?: string | null;
  next_billing_date?: string | null;
  trial_ends_at?: string | null;
  created_at?: string;
}

export interface Printer {
  id: string;
  shop_id: string;
  name: string;
  display_name?: string | null;
  status: 'online' | 'offline' | 'busy' | 'error';
  last_seen_at?: string | null;
  created_at?: string;
}

export type PaymentMode = 'online' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type PrintStatus = 'pending_payment' | 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  shop_id: string;
  printer_id?: string | null;
  token_number: number;
  file_url: string;
  file_name?: string | null;
  file_type?: string | null;
  file_size_bytes?: number | null;
  pages: number;
  copies: number;
  paper_size: string;
  color_mode: 'bw' | 'color';
  duplex: boolean;
  orientation: 'portrait' | 'landscape' | 'auto';
  price: number;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  print_status: PrintStatus;
  failure_reason?: string | null;
  created_at: string;
  queued_at?: string | null;
  completed_at?: string | null;
}

export interface JobQueuePosition {
  id: string;
  shop_id: string;
  token_number: number;
  print_status: string;
  payment_mode: string;
  payment_status: string;
  position_ahead: number;
}

export interface Payment {
  id: string;
  job_id: string;
  gateway_payment_id?: string | null;
  gateway_order_id?: string | null;
  amount: number;
  status: string;
  raw_response?: Record<string, unknown> | null;
  created_at?: string;
}
