export enum TourType {
  GION_KLOOK = 'GION_Klook',
  GION_VIATOR = 'GION_Viator',
  GION_GYG = 'GION_GYG',
  ARASHIYAMA_KLOOK = 'ARASHIYAMA_Klook',
  ARASHIYAMA_VIATOR = 'ARASHIYAMA_Viator',
  ARASHIYAMA_GYG = 'ARASHIYAMA_GYG',
  FOOD_KLOOK = 'FOOD_Klook',
  FOOD_VIATOR = 'FOOD_Viator',
  FREE_TOUR = 'FREE_TOUR',
  PRIVATE_TOUR = 'PRIVATE_TOUR'
}

export type Language = 'ja' | 'en';

export type Currency = 'JPY' | 'EUR' | 'USD' | 'GBP' | 'TWD' | 'CNY';

export interface TourRecord {
  id: string;
  date: string;
  type: TourType;
  guide: string;
  revenue: number; // Always in JPY for stats
  currency: Currency;
  originalAmount: number;
  guests: number;
  duration: number;
  notes?: string;
  createdAt: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalGuests: number;
  totalHours: number;
  revenueByTour: Record<TourType, number>;
}