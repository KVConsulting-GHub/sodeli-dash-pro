import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { OverviewMetrics, PlatformPerformance } from '../types';
import { MetricCard } from './MetricCard';
import { formatCurrency, formatNumber, formatPercent } from '../lib/utils';
import { Users, Filter, Target, DollarSign, TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const FunnelView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ total: OverviewMetrics; platforms: PlatformPerformance[] } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformPerformance | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api.getOverview({});
        setData(result);
      } catch (error) {
        console.error("Failed to fetch overview", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!data) return <div>Erro ao carregar dados.</div>;

  const { total, platforms } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Overview Section */}
      <section>
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
           <Activity className="h-5 w-5 text-red-600" />
           Visão Geral do Funil
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard 
            title="Leads Totais" 
            value={formatNumber(total.leads)} 
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard 
            title="Leads Qualificados" 
            value={formatNumber(total.qualified_leads)} 
            subValue={`Taxa: ${formatPercent(total.rate_leads_to_qualified)}`}
            trend="up"
            icon={<Filter className="h-4 w-4" />}
          />
          <MetricCard 
            title="Oportunidades" 
            value={formatNumber(total.opportunities)} 
            subValue={`Taxa: ${formatPercent(total.rate_qualified_to_opportunity)}`}
            trend="up"
            icon={<Target className="h-4 w-4" />}
          />
          <MetricCard 
            title="Vendas" 
            value={formatNumber(total.sales)} 
            subValue={`Taxa: ${formatPercent(total.rate_opportunity_to_sale)}`}
            trend="up"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard 
            title="Investimento" 
            value={formatCurrency(total.spend)} 
            icon={<TrendingUp className="h-4 w-4" />}
            className="border-red-100 bg-red-50/50"
          />
        </div>
      </section>

      {/* Platform Performance Section */}
      <section>
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
           <BarChart3 className="h-5 w-5 text-red-600" />
           Desempenho por Plataforma
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <Card key={platform.platform} className="bg-white hover:shadow-md transition-shadow duration-200">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="capitalize flex justify-between items-center">
                  {platform.platform.replace('_', ' ')}
                  <PieChart className="h-4 w-4 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Leads</p>
                        <p className="text-lg font-bold">{formatNumber(platform.leads)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Vendas</p>
                        <p className="text-lg font-bold">{formatNumber(platform.sales)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Investimento</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(platform.spend)}</p>
                    </div>
                     <div>
                        <p className="text-xs text-gray-500">CPL</p>
                        <p className="text-lg font-bold">{formatCurrency(platform.cpl)}</p>
                    </div>
                </div>

                <div className="pt-2 border-t border-gray-50">
                   <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>CPV: {formatCurrency(platform.cpv)}</span>
                      <span>Cliques: {formatNumber(platform.clicks)}</span>
                   </div>
                </div>

                <button 
                  onClick={() => setSelectedPlatform(platform)}
                  className="w-full mt-4 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-md transition-colors"
                >
                  Mais detalhes
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Detail Drawer / Modal (Simplified as inline expansion for this demo) */}
      {selectedPlatform && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-xl font-bold capitalize">{selectedPlatform.platform.replace('_', ' ')} - Detalhes Diários</h3>
               <button onClick={() => setSelectedPlatform(null)} className="text-gray-400 hover:text-gray-600">
                 X
               </button>
            </div>
            <div className="p-6">
               <div className="h-80 w-full">
                 <h4 className="text-sm font-semibold mb-4 text-gray-600">Histórico de Investimento vs Leads</h4>
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={selectedPlatform.dailyHistory}>
                     <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                     <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} 
                        tick={{ fontSize: 12 }}
                     />
                     <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                     <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                     <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                        formatter={(value: number, name: string) => [
                          name === 'spend' ? formatCurrency(value) : value,
                          name === 'spend' ? 'Investimento' : 'Leads'
                        ]}
                     />
                     <Area yAxisId="left" type="monotone" dataKey="spend" stroke="#ef4444" fillOpacity={1} fill="url(#colorSpend)" name="spend" />
                     <Area yAxisId="right" type="monotone" dataKey="leads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLeads)" name="leads" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};