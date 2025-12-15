import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar 
} from 'recharts';
import { SimulationResult, ScenarioType } from '../types';
import { Users, Clock, AlertOctagon, Activity } from 'lucide-react';

interface Props {
  results: SimulationResult | null;
  scenario: ScenarioType;
}

export const ResultsDashboard: React.FC<Props> = ({ results, scenario }) => {
  if (!results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full">
        <Activity size={64} className="mb-4 opacity-20" />
        <p className="text-lg">Lancez une simulation pour voir les résultats.</p>
      </div>
    );
  }

  const { stats, timeline } = results;

  // Downsample timeline for charts if too long (improve performance)
  const chartData = timeline.length > 200 
    ? timeline.filter((_, i) => i % Math.ceil(timeline.length / 200) === 0) 
    : timeline;

  return (
    <div className="flex-1 p-8 overflow-y-auto h-full bg-slate-100">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Tableau de Bord Analytique</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard 
          title="Temps Moyen Séjour" 
          value={`${stats.avgSystemTime.toFixed(1)} ticks`} 
          icon={<Clock className="text-blue-500" />} 
          sub="Temps total dans le système"
        />
        <KpiCard 
          title="Temps Moyen Attente" 
          value={`${stats.avgWaitTime.toFixed(1)} ticks`} 
          icon={<Users className="text-indigo-500" />} 
          sub="Temps passé dans les files"
        />
        <KpiCard 
          title="Utilisation Serveurs" 
          value={`${(stats.serverUtilization * 100).toFixed(1)}%`} 
          icon={<Activity className="text-emerald-500" />} 
          sub="Charge moyenne des processeurs"
        />
        <KpiCard 
          title="Taux de Rejet Total" 
          value={`${((stats.dropRateExec + stats.dropRateResult) * 100).toFixed(1)}%`} 
          icon={<AlertOctagon className="text-red-500" />} 
          sub={`Exec: ${(stats.dropRateExec * 100).toFixed(1)}% | Res: ${(stats.dropRateResult * 100).toFixed(1)}%`}
          alert={(stats.dropRateExec + stats.dropRateResult) > 0.1}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Queue Lengths Over Time */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Évolution des Files d'Attente</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorQ1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQ2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="q1Length" name="File Exécution" stroke="#3b82f6" fillOpacity={1} fill="url(#colorQ1)" />
                <Area type="monotone" dataKey="q2Length" name="File Retour" stroke="#10b981" fillOpacity={1} fill="url(#colorQ2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dropped Agents */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Rejets Cumulés (Perte de Données)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="droppedCount" name="Total Rejeté" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completedCount" name="Total Complété" stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Scenario Specific Charts */}
      {scenario === ScenarioType.CHANNELS_DAMS && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8">
           <h3 className="text-lg font-semibold text-slate-700 mb-4">Cycle du Barrage (Régulation ING)</h3>
           <div className="h-48">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData.slice(0, 100)}> {/* Zoom on first 100 ticks to show cycle */}
                 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                 <XAxis dataKey="time" label={{ value: 'Temps (Ticks)', position: 'insideBottomRight', offset: -5 }} />
                 <YAxis label={{ value: 'Ouvert (1) / Fermé (0)', angle: -90, position: 'insideLeft' }} domain={[0, 1.2]} ticks={[0, 1]} />
                 <Tooltip />
                 <Area type="step" dataKey="damOpen" name="Barrage Ouvert ?" stroke="#f59e0b" fill="#fef3c7" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
           <p className="text-xs text-slate-500 mt-2 text-center">Zoom sur les 100 premiers ticks pour visualiser le cycle d'ouverture/fermeture du barrage.</p>
        </div>
      )}
    </div>
  );
};

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode; sub: string; alert?: boolean }> = ({ title, value, icon, sub, alert }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border transition-all hover:shadow-md ${alert ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className={`text-2xl font-bold mt-1 ${alert ? 'text-red-700' : 'text-slate-800'}`}>{value}</h4>
      </div>
      <div className={`p-2 rounded-lg ${alert ? 'bg-red-100' : 'bg-slate-100'}`}>
        {icon}
      </div>
    </div>
    <p className={`text-xs ${alert ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>{sub}</p>
  </div>
);