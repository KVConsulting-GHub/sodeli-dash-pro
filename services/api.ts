import { OverviewMetrics, PlatformPerformance, Deal, Contact, PaginatedResponse, FilterOptions, Platform } from '../types';

// ==========================================
// MOCK DATA GENERATORS (Simulating BigQuery)
// ==========================================

const generateDailyHistory = (days: number) => {
  return Array.from({ length: days }).map((_, i) => ({
    date: new Date(Date.now() - (days - i) * 86400000).toISOString(),
    spend: Math.floor(Math.random() * 2000) + 500,
    leads: Math.floor(Math.random() * 50) + 10,
  }));
};

const mockOverview: OverviewMetrics = {
  total_users: 15420,
  leads: 3450,
  qualified_leads: 890,
  opportunities: 210,
  sales: 85,
  spend: 45200.50,
  impressions: 1250000,
  clicks: 45000,
  cpl: 13.10,
  cpq: 50.78,
  cpo: 215.24,
  cpv: 531.77,
  rate_leads_to_qualified: 0.258,
  rate_qualified_to_opportunity: 0.235,
  rate_opportunity_to_sale: 0.404,
};

const mockPlatformData = (platform: Platform): PlatformPerformance => ({
  ...mockOverview,
  platform,
  leads: Math.floor(mockOverview.leads / 3),
  sales: Math.floor(mockOverview.sales / 3),
  spend: Math.floor(mockOverview.spend / 3),
  cpl: Math.random() * 20 + 5,
  cpv: Math.random() * 200 + 100,
  dailyHistory: generateDailyHistory(30),
});

const mockDeals: Deal[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `deal-${i}`,
  created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  win_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 5000000000).toISOString() : undefined,
  amount_total: Math.floor(Math.random() * 5000) + 1000,
  organization_name: `Empresa ${i + 1} Ltda`,
  user_name: ['João Silva', 'Maria Souza', 'Carlos Pereira'][Math.floor(Math.random() * 3)],
  email: `contato${i}@empresa${i}.com.br`,
  phone: '(11) 99999-9999',
  deal_source_name: ['Google Ads', 'Indicação', 'Linkedin Ads', 'Meta Ads'][Math.floor(Math.random() * 4)],
  deal_stage_name: ['Qualificado', 'Negociação', 'Fechado', 'Perdido'][Math.floor(Math.random() * 4)],
  win: Math.random() > 0.7,
}));

const mockContacts: Contact[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `contact-${i}`,
  created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  name: `Lead ${i + 1}`,
  email: `lead${i}@gmail.com`,
  last_conversion_date: new Date(Date.now() - Math.random() * 5000000000).toISOString(),
}));

// ==========================================
// API CLIENT FUNCTIONS
// ==========================================

const DELAY_MS = 800;

export const api = {
  getOverview: async (options: FilterOptions): Promise<{ total: OverviewMetrics; platforms: PlatformPerformance[] }> => {
    // In production:
    // const params = new URLSearchParams(options as any);
    // const res = await fetch(`/api/overview?${params}`);
    // return res.json();
    
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

    return {
      total: mockOverview,
      platforms: [
        mockPlatformData('google_ads'),
        mockPlatformData('meta_ads'),
        mockPlatformData('linkedin_ads'),
      ],
    };
  },

  getDeals: async (options: FilterOptions): Promise<PaginatedResponse<Deal>> => {
    // In production: fetch(`/api/deals?type=${options.type}&page=${options.page}...`)
    
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    
    let filtered = mockDeals;

    if (options.type === 'won') {
      filtered = filtered.filter(d => d.win);
    } else if (options.type === 'opportunity') {
      filtered = filtered.filter(d => !d.win && !d.deal_stage_name.toLowerCase().includes('perdido'));
    } else if (options.type === 'qualified') {
      filtered = filtered.filter(d => d.deal_stage_name.toLowerCase().includes('qualificado'));
    }

    if (options.search) {
      const s = options.search.toLowerCase();
      filtered = filtered.filter(d => 
        d.organization_name.toLowerCase().includes(s) || 
        d.email.toLowerCase().includes(s)
      );
    }

    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const start = (page - 1) * pageSize;
    
    return {
      data: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize
    };
  },

  getContacts: async (options: FilterOptions): Promise<PaginatedResponse<Contact>> => {
    // In production: fetch(`/api/contacts?search=${options.search}...`)
    
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    
    let filtered = mockContacts;
    
    if (options.search) {
      const s = options.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(s) || 
        c.email.toLowerCase().includes(s)
      );
    }
    
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const start = (page - 1) * pageSize;

    return {
      data: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize
    };
  }
};