import React from 'react';
import { GeneralStats } from '../types';

interface DashboardStatsProps {
  stats: GeneralStats;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* 1. KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-brand-card py-4 px-4 rounded-xl shadow-lg border border-brand-border flex flex-col items-center justify-center text-center">
          <p className="text-[11px] sm:text-xs text-brand-secondary font-bold tracking-wider mb-1.5 uppercase">
            Retiradas Registradas
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-white">
            {stats.totalRetiradas}
          </p>
        </div>

        <div className="bg-brand-card py-4 px-4 rounded-xl shadow-lg border border-brand-border flex flex-col items-center justify-center text-center">
          <p className="text-[11px] sm:text-xs text-brand-secondary font-bold tracking-wider mb-1.5 uppercase">
            Roteadores Coletados
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-white">
            {stats.roteadores}
          </p>
        </div>

        <div className="bg-brand-card py-4 px-4 rounded-xl shadow-lg border border-brand-border flex flex-col items-center justify-center text-center">
          <p className="text-[11px] sm:text-xs text-brand-secondary font-bold tracking-wider mb-1.5 uppercase">
            ONUs Coletadas
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-white">
            {stats.onu}
          </p>
        </div>

        <div className="bg-brand-card py-4 px-4 rounded-xl shadow-lg border border-brand-border flex flex-col items-center justify-center text-center">
          <p className="text-[11px] sm:text-xs text-brand-secondary font-bold tracking-wider mb-1.5 uppercase">
            ONTs Coletadas
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-white">
            {stats.ont}
          </p>
        </div>

        <div className="bg-brand-card py-4 px-4 rounded-xl shadow-lg border border-brand-border flex flex-col items-center justify-center text-center">
          <p className="text-[11px] sm:text-xs text-brand-secondary font-bold tracking-wider mb-1.5 uppercase">
            Pendentes Estoque
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-[#d6a20b]">
            {stats.pendentesConferencia}
          </p>
        </div>

      </div>

      {/* 2. Charts / Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Desempenho por Equipe */}
        <div className="bg-brand-card p-5 rounded-xl border border-brand-border shadow-lg">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-[#125366] pb-2 flex items-center gap-2">
            🏆 Desempenho por Equipe
          </h3>
          <div className="space-y-3.5">
            {stats.topTechnicians.length === 0 ? (
              <p className="text-xs text-brand-secondary italic">Sem dados disponíveis.</p>
            ) : (
              stats.topTechnicians.map((tech, index) => {
                const maxCount = stats.topTechnicians[0].count || 1;
                const widthPercent = (tech.count / maxCount) * 100;
                return (
                  <div key={tech.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white truncate max-w-[220px]">
                        {index + 1}. {tech.name}
                      </span>
                      <span className="text-brand-accent font-bold">
                        {tech.count} recolhimentos
                      </span>
                    </div>
                    <div className="w-full bg-brand-bg h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#009b7d] to-[#0bd6a8] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Principais Motivos de Retirada */}
        <div className="bg-brand-card p-5 rounded-xl border border-brand-border shadow-lg">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-[#125366] pb-2 flex items-center gap-2">
            📊 Principais Motivos de Retirada
          </h3>
          <div className="space-y-3.5">
            {stats.topTypes.length === 0 ? (
              <p className="text-xs text-brand-secondary italic">Sem dados disponíveis.</p>
            ) : (
              stats.topTypes.map((type) => {
                const maxCount = stats.topTypes[0].count || 1;
                const widthPercent = (type.count / maxCount) * 100;
                return (
                  <div key={type.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white truncate max-w-[220px]" title={type.name}>
                        {type.name.replace('Retirada - ', '')}
                      </span>
                      <span className="text-brand-secondary font-bold">
                        {type.count}
                      </span>
                    </div>
                    <div className="w-full bg-brand-bg h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-secondary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
