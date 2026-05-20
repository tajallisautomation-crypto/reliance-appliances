export interface CustomerProfile {
  user_id:        string
  full_name:      string
  phone:          string
  address_type:   'residence' | 'office'
  city:           string
  address:        string
  loyalty_points: number
  loyalty_tier:   'bronze' | 'silver' | 'gold' | 'platinum'
  referral_code:  string
  referred_by:    string | null
  created_at:     string
}

export interface CustomerAppliance {
  id:                   string
  user_id:              string
  brand:                string
  model:                string
  category:             string
  purchase_year:        number | null
  purchase_source:      'tajallis' | 'other'
  last_serviced_at:     string | null
  is_active:            boolean
  notes:                string
  serial_no:            string | null
  warranty_start_date:  string | null
  warranty_end_date:    string | null
  delivery_date:        string | null
  installation_date:    string | null
  area_location:        string | null
  created_at:           string
}

export interface CustomerCarePlan {
  id:               string
  user_id:          string
  appliance_id:     string | null
  plan_tier:        'essential' | 'plus' | 'elite'
  status:           'pending_inspection' | 'inspection_required' | 'active' | 'expiring_soon' | 'expired' | 'not_eligible' | 'cancelled'
  activated_at:     string | null
  expires_at:       string | null
  annual_price:     number | null
  replacement_used: boolean
  notes:            string
  created_at:       string
}

export interface LoyaltyTransaction {
  id:          string
  type:        string
  points:      number
  description: string
  created_at:  string
}

export interface ReferralEarning {
  id:                string
  order_id:          string | null
  order_amount:      number | null
  commission_amount: number | null
  status:            'pending' | 'confirmed' | 'paid'
  created_at:        string
}

export interface PortalOrder {
  id:             string
  customer_name:  string
  customer_email: string | null
  customer_phone: string
  products:       Array<{ model: string; brand: string; qty: number; price: number }>
  total_amount:   number
  payment_method: string
  advance_paid:   number | null
  monthly_amount: number | null
  created_at:     string
  status:         string | null
}

export interface PortalData {
  profile:          CustomerProfile | null
  appliances:       CustomerAppliance[]
  loyaltyTxns:      LoyaltyTransaction[]
  referralEarnings: ReferralEarning[]
  orders:           PortalOrder[]
  carePlans:        CustomerCarePlan[]
  reload:           () => void
  navigateTo?:      (tab: string) => void
}
