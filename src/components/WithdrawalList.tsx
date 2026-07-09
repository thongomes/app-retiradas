import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  ExternalLink, 
  Eye, 
  Filter
} from 'lucide-react';
import { Withdrawal } from '../types';
import { formatDateBR } from '../utils/exportCsv';

interface WithdrawalListProps {
  withdrawals: Withdrawal[];
  currentUserUid: string;
  isAdmin: boolean;
  onStatusUpdate: (id: string, status: Withdrawal['status']) => Promise<void>;
  onDelete: (id: string, createdBy: string) => Promise<void>;
}

export const WithdrawalList: React.FC<WithdrawalListProps> = ({
  withdrawals,
  currentUserUid,
  isAdmin,
  onStatusUpdate,
  onDelete
}) => {
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'Todos' | 'Hoje' | 'Ontem' | 'Semana' | 'Mes'>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Avariado' | 'Recebido'>('Todos');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');

  // Preview Modal state
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Extract unique types from withdrawals for the filter dropdown
  const uniqueTypes = React.useMemo(() => {
    const types = new Set<string>();
    withdrawals.forEach((w) => {
      if (w.type) types.add(w.type);
    });
    return Array.from(types).sort();
  }, [withdrawals]);

  // Filter withdrawals list
  const filteredWithdrawals = React.useMemo(() => {
    return withdrawals.filter((w) => {
      // 1. Text Search filter
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchClient = w.client?.toLowerCase().includes(term);
        const matchTech = w.technician?.toLowerCase().includes(term);
        const matchAddr = w.address?.toLowerCase().includes(term);
        const matchNotes = w.notes?.toLowerCase().includes(term);
        
        let matchSerial = false;
        if (w.serials) {
          matchSerial = Object.values(w.serials).some((list) =>
            list.some((sn) => sn.toLowerCase().includes(term))
          );
        }

        if (!matchClient && !matchTech && !matchAddr && !matchNotes && !matchSerial) {
          return false;
        }
      }

      // 2. Status filter
      const currentStatus = w.status || 'Pendente';
      if (statusFilter !== 'Todos' && currentStatus !== statusFilter) {
        return false;
      }

      // 3. Category Type filter
      if (typeFilter !== 'Todos' && w.type !== typeFilter) {
        return false;
      }

      // 4. Date filter
      if (dateFilter !== 'Todos' && w.date) {
        const recordDate = new Date(`${w.date}T12:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'Hoje') {
          const todayStr = new Date().toISOString().split('T')[0];
          if (w.date !== todayStr) return false;
        } else if (dateFilter === 'Ontem') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          if (w.date !== yesterdayStr) return false;
        } else if (dateFilter === 'Semana') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (recordDate < weekAgo) return false;
        } else if (dateFilter === 'Mes') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          if (recordDate < monthStart) return false;
        }
      }

      return true;
    });
  }, [withdrawals, searchTerm, dateFilter, statusFilter, typeFilter]);

  const openGoogleMaps = (addr: string) => {
    if (!addr) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusColor = (status: Withdrawal['status']) => {
    switch (status) {
      case 'Recebido':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Avariado':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Pendente':
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Controls */}
      <div className="bg-brand-card p-5 rounded-xl border border-brand-border shadow-lg space-y-4">
        
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-brand-secondary" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por cliente, técnico, endereço ou número de série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-lg bg-brand-input border border-brand-border text-white placeholder-[#456b78] px-3 py-2.5 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all text-sm"
          />
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-brand-secondary mb-1 uppercase tracking-wider">
              Período
            </label>
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full rounded-lg bg-brand-input border border-brand-border text-white px-3 py-2 text-sm focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none appearance-none cursor-pointer"
              >
                <option value="Todos">Todos os registros</option>
                <option value="Hoje">Hoje</option>
                <option value="Ontem">Ontem</option>
                <option value="Semana">Últimos 7 dias</option>
                <option value="Mes">Este mês</option>
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-brand-secondary mb-1 uppercase tracking-wider">
              Status Conferencia
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-lg bg-brand-input border border-brand-border text-white px-3 py-2 text-sm focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none appearance-none cursor-pointer"
            >
              <option value="Todos">Todos os status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Recebido">Recebidos Ok</option>
              <option value="Avariado">Avariados</option>
            </select>
          </div>

          {/* Category Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-brand-secondary mb-1 uppercase tracking-wider">
              Motivo
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg bg-brand-input border border-brand-border text-white px-3 py-2 text-sm focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none appearance-none cursor-pointer"
            >
              <option value="Todos">Todos os motivos</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* List Container */}
      <div className="bg-brand-card rounded-xl border border-brand-border shadow-lg overflow-hidden">
        <div className="bg-[#07303d] border-b border-brand-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-accent" />
            <h3 className="font-semibold text-white">
              Histórico de Retiradas ({filteredWithdrawals.length})
            </h3>
          </div>
        </div>

        {filteredWithdrawals.length === 0 ? (
          <div className="p-10 text-center text-brand-secondary italic">
            Nenhuma retirada correspondente encontrada.
          </div>
        ) : (
          <div className="divide-y divide-[#125366]">
            {filteredWithdrawals.map((w) => {
              const currentStatus = w.status || 'Pendente';
              const canDelete = isAdmin || w.createdBy === currentUserUid;

              return (
                <div key={w.id} className="p-5 hover:bg-brand-input/10 transition-colors space-y-4">
                  
                  {/* Row Top Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-brand-accent bg-brand-accent/10 border border-brand-accent/20 px-2 py-0.5 rounded-full mr-2">
                        {w.type}
                      </span>
                      <span className="text-xs text-brand-secondary font-medium">
                        {formatDateBR(w.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status select for admins, otherwise static badge */}
                      {isAdmin && w.id ? (
                        <select
                          value={currentStatus}
                          onChange={(e) => onStatusUpdate(w.id!, e.target.value as any)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg outline-none cursor-pointer ${getStatusColor(currentStatus)}`}
                        >
                          <option value="Pendente" className="bg-brand-card text-amber-400">Pendente</option>
                          <option value="Recebido" className="bg-brand-card text-emerald-400">Recebido Ok</option>
                          <option value="Avariado" className="bg-brand-card text-red-400">Avariado</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getStatusColor(currentStatus)}`}>
                          {currentStatus}
                        </span>
                      )}

                      {/* Delete Action */}
                      {canDelete && w.id && (
                        <button
                          onClick={() => onDelete(w.id!, w.createdBy)}
                          className="p-1.5 bg-[#ff6868]/10 text-[#ff6868] hover:bg-[#ff6868]/20 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row Body Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    
                    {/* Client & Address */}
                    <div className="space-y-1">
                      <p className="text-brand-secondary font-bold text-xs uppercase tracking-wider">Cliente / Endereço</p>
                      <p className="text-white font-semibold">{w.client}</p>
                      <button 
                        onClick={() => openGoogleMaps(w.address)}
                        className="text-xs text-brand-accent hover:underline flex items-center gap-1 group text-left cursor-pointer"
                      >
                        <span className="truncate max-w-[240px]">{w.address}</span>
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    {/* Materials & Serials */}
                    <div className="space-y-1">
                      <p className="text-brand-secondary font-bold text-xs uppercase tracking-wider">Equipamentos Recolhidos</p>
                      <div className="text-xs space-y-1 text-white font-medium">
                        {w.materials && Object.entries(w.materials).map(([key, count]) => {
                          const snList = w.serials && w.serials[key] ? w.serials[key].filter(Boolean) : [];
                          return (
                            <div key={key} className="bg-brand-bg/40 p-1.5 rounded border border-brand-border/40">
                              <p className="font-semibold text-brand-accent">{count}x {key}</p>
                              {snList.length > 0 && (
                                <p className="text-[10px] text-brand-secondary">
                                  S/N: {snList.join(', ')}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Photo & Notes */}
                    <div className="space-y-2">
                      <p className="text-brand-secondary font-bold text-xs uppercase tracking-wider">Comprovante / Técnico</p>
                      <div className="flex items-start gap-3">
                        {w.photoUrl ? (
                          <button
                            onClick={() => setPreviewPhoto(w.photoUrl)}
                            className="relative w-16 h-12 rounded overflow-hidden border border-brand-border/60 hover:border-brand-accent transition-all cursor-pointer group flex-shrink-0"
                          >
                            <img src={w.photoUrl} alt="Miniatura" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-16 h-12 rounded bg-brand-input border border-brand-border flex items-center justify-center text-xs text-brand-secondary">
                            Sem Foto
                          </div>
                        )}
                        <div className="text-xs">
                          <p className="text-white font-semibold">{w.technician}</p>
                          {w.notes && (
                            <p className="text-brand-secondary italic mt-1 line-clamp-2" title={w.notes}>
                              "{w.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox / Preview Photo Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-999 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] rounded-xl overflow-hidden shadow-2xl border border-brand-border">
            <img 
              src={previewPhoto} 
              alt="Comprovante ampliado" 
              className="w-full h-auto max-h-[80vh] object-contain mx-auto" 
            />
            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-4 text-center">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="bg-brand-accent text-brand-bg font-bold px-5 py-2 rounded-xl text-xs hover:bg-[#09c096] transition-colors cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
