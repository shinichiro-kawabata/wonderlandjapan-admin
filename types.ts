export enum TourType {
  GION_WALK = 'GION_WALK',
  ARASHIYAMA_WALK = 'ARASHIYAMA_WALK',
  KYOTO_FOOD = 'KYOTO_FOOD',
  OSAKA_FOOD = 'OSAKA_FOOD',
  FREE_TOUR = 'FREE_TOUR'
}

export type Language = 'ja' | 'en';

export interface TourRecord {
  id: string;
  date: string;
  type: TourType;
  guide: string;
  revenue: number;
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