export enum TourType {
  GION_WALK = '祇園步行',
  ARASHIYAMA_WALK = '嵐山步行',
  KYOTO_FOOD = '京都美食導覽',
  OSAKA_FOOD = '大阪美食導覽',
  FREE_TOUR = '無料導覽'
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