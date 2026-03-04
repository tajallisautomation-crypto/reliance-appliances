// Re-export unified types from api.ts — all pages should import from here or api.ts
export type { Product, InstallmentPlan, Category } from './api';

export interface ProductImage {
  url: string;
  alt: string;
  type: 'thumbnail' | 'gallery';
}

export interface SubCategory {
  name: string;
  slug: string;
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
