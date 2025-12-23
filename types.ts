export type Platform = 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'all';

export interface OverviewMetrics {
  total_users: number;
  leads: number;
  qualified_leads: number;
  opportunities: number;
  sales: number;
  spend: number;
  impressions: number;
  clicks: number;
  cpl: number;
  cpq: number; // Cost per Qualified
  cpo: number; // Cost per Opportunity
  cpv: number; // Cost per Sale (Venda)
  rate_leads_to_qualified: number;
  rate_qualified_to_opportunity: number;
  rate_opportunity_to_sale: number;
}

export interface DailyData {
  date: string;
  spend: number;
  leads: number;
}

export interface PlatformPerformance extends OverviewMetrics {
  platform: Platform;
  dailyHistory: DailyData[];
}

export interface Deal {
  id: string;
  win_at?: string; // or closed_at
  created_at: string;
  amount_total: number;
  organization_name: string;
  user_name: string; // Responsible
  email: string;
  phone?: string;
  deal_source_name?: string;
  deal_stage_name: string;
  win: boolean;
}

export interface Contact {
  id: string;
  created_at: string;
  name: string;
  email: string;
  last_conversion_date?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterOptions {
  dateStart?: Date;
  dateEnd?: Date;
  platform?: Platform;
  search?: string;
  page?: number;
  pageSize?: number;
  type?: 'won' | 'opportunity' | 'qualified';
}