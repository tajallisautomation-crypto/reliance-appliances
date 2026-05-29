// Shared types used across AdminPortal tab components.
// AdminPortal.tsx re-declares some of these locally; migrate callers here over time.

export interface PackageComponent {
  id: string;
  name: string;
  qty: number;
  keySpec: string;
  warranty: string;
  status: 'included' | 'addon';
  addonPrice: number;
  hidden: boolean;
  group: 'core' | 'generation' | 'infrastructure' | 'service';
}

export type InvoiceRow = {
  id: string;
  ref_number: string;
  doc_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_cnic: string | null;
  customer_type: string | null;
  customer_area: string | null;
  sale_type: string | null;
  service_level: string | null;
  discount_reason: string | null;
  subtotal: number;
  discount_pct: number;
  discount_type: string | null;
  grand_total: number;
  advance_pct: number | null;
  payment_status: string;
  created_at: string;
  // installment columns
  inst_total_price: number | null;
  inst_advance_amt: number | null;
  inst_months: number | null;
  inst_monthly_amt: number | null;
  inst_first_date: string | null;
  // v3 columns
  custom_charges_json: Array<{ name: string; amount: number }> | null;
  guarantor_name: string | null;
  guarantor_phone: string | null;
  guarantor_cnic: string | null;
  notes: string | null;
  prepared_by: string | null;
  discount_mode: string | null;
  is_existing_customer: boolean | null;
  stock_status: string | null;
  show_ntn: boolean | null;
  delivery_eta: string | null;
  validity_hours: number | null;
  advance_mode: string | null;
  advance_fixed_amt: number | null;
  balance_note: string | null;
  cash_pay_schedule_json: Array<{ date: string; amount: number; note: string }> | null;
  inst_schedule_json: Array<{ no: number; label: string; dueDate: string; amount: number }> | null;
  // migration 20260519
  amount_paid: number | null;
  trade_ins_json: Array<{ description: string; value: number }> | null;
  discounts_json: Array<{ mode: 'percentage' | 'fixed'; amount: number; type: string; reason: string }> | null;
  // migration 20260522
  portal_user_id: string | null;
  invoice_lines?: Array<{
    name: string;
    model: string | null;
    category: string | null;
    qty: number;
    unit_price: number;
    kwh_per_month: number | null;
    warranty: string | null;
    key_spec: string | null;
    key_specs_json: { displayPrefix?: string; packageNote?: string; isPackage?: boolean; packageComponents?: PackageComponent[] } | null;
    product_id: string | null;
  }>;
  invoice_services?: Array<{
    service_type: string;
    service_name: string;
    description: string;
    status: 'included' | 'charged' | 'not_selected';
    visible_value: number;
    charged_amount: number;
  }>;
};

export type InstallmentSlot = {
  id: string;
  installment_no: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_date: string | null;
  payment_method: string | null;
  receipt_ref: string | null;
};

export type LedgerRow = {
  id: string;
  ref_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  inst_total_price: number | null;
  inst_advance_amt: number | null;
  inst_months: number | null;
  inst_monthly_amt: number | null;
  payment_status: string;
  slots: InstallmentSlot[];
};

export interface CustomerProfile {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cnic: string | null;
  area: string | null;
  totalSpent: number;
  invoiceCount: number;
  transactionCount: number;
  firstAt: string;
  lastAt: string;
  hasActiveInstallment: boolean;
  hasServiceHistory: boolean;
  invoices: InvoiceRow[];
}

export interface CustomerNote {
  id: string;
  customer_phone: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

export const STATUS_COLORS: Record<string, string> = {
  pending:       'bg-yellow-100 text-yellow-800',
  partial:       'bg-blue-100 text-blue-800',
  advance_paid:  'bg-orange-100 text-orange-800',
  paid:          'bg-green-100 text-green-800',
  overdue:       'bg-red-100 text-red-800',
};

export function getAutoTags(p: CustomerProfile): string[] {
  const tags: string[] = [];
  const daysSinceLast = (Date.now() - new Date(p.lastAt).getTime()) / 86400000;
  if (p.totalSpent >= 200000) tags.push('VIP');
  else if (p.totalSpent >= 100000) tags.push('High Value');
  if (p.transactionCount >= 3) tags.push('Loyal');
  else if (p.transactionCount >= 2) tags.push('Returning');
  else if (p.transactionCount === 1) tags.push('New');
  if (p.hasActiveInstallment) tags.push('Active Installment');
  if (p.hasServiceHistory) tags.push('Service History');
  if (daysSinceLast > 180) tags.push('Lapsed');
  else if (daysSinceLast > 90) tags.push('At Risk');
  return tags;
}
