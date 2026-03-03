export interface ProductImage {
  url: string;
  alt: string;
  type: 'thumbnail' | 'gallery';
}

export interface InstallmentPlan {
  months:  number;
  total:   number;
  advance: number;
  monthly: number;
}

export interface Product {
  id:          string;
  brand:       string;
  model:       string;
  category:    string;
  slug:        string;
  description: string;
  specs:       Record<string, string>;
  tags:        string;
  colors:      string;
  price: {
    min:      number;
    retail:   number;
    cash_floor: number;
  };
  installments: {
    '2m': InstallmentPlan;
    '3m': InstallmentPlan;
    '6m': InstallmentPlan;
    '12m': InstallmentPlan;
  };
  warranty:     string;
  stock_status: string;
  featured:     boolean;
  thumbnail:    string;   // primary image URL
  gallery:      string[]; // additional image URLs
  seo: { title: string; description: string; keywords: string };
}

export interface Category {
  name: string;
  slug: string;
  icon: string;
}

export interface Customer {
  id:           string;
  name:         string;
  phone:        string;
  email:        string;
  area:         string;
  tier:         'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  points:       number;
  totalSpend:   number;
  referralCode: string;
  joinDate:     string;
}

export interface Order {
  id:        string;
  date:      string;
  product:   string;
  productId: string;
  amount:    number;
  plan:      string;
  status:    string;
  installmentsRemaining: number;
  warrantyExpiry: string;
  nextService: string;
}

export interface CrmRecord {
  customerId:   string;
  customerName: string;
  phone:        string;
  productId:    string;
  productName:  string;
  saleDate:     string;
  warrantyExpiry: string;
  nextFollowUp: string;
  followUpType: 'post-sale' | 'quarterly' | 'annual' | 'maintenance' | 'renewal';
  powerNotes:   string;
  notes:        string;
}
