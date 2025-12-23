import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { FunnelView } from './components/FunnelView';
import { CRMView } from './components/CRMView';

function App() {
  const [activeTab, setActiveTab] = useState<'funnel' | 'crm'>('funnel');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {activeTab === 'funnel' ? 'Performance de Marketing' : 'Gestão de CRM'}
        </h1>
        <p className="text-gray-500 mt-1">
          {activeTab === 'funnel' 
            ? 'Acompanhe as principais métricas de conversão e investimento.' 
            : 'Visualize suas vendas, oportunidades e base de leads.'}
        </p>
      </div>
      
      {activeTab === 'funnel' ? <FunnelView /> : <CRMView />}
    </Layout>
  );
}

export default App;