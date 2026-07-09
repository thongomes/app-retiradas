import { useEffect, useState, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { Loader2, FileSpreadsheet, FileDown } from 'lucide-react';

import { useAuth } from './hooks/useAuth';
import { db, COLLECTION_PATH_RETIRADAS } from './config/firebase';
import { Withdrawal, GeneralStats } from './types';

// Export utilities
import { exportToCSV } from './utils/exportCsv';
import { exportToPDF } from './utils/exportPdf';

// Components
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { WithdrawalForm } from './components/WithdrawalForm';
import { WithdrawalList } from './components/WithdrawalList';

export default function App() {
  const { user, loading, hasAccess, loginWithGoogle, logout } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [saving, setSaving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Firestore Snapshot Subscription
  useEffect(() => {
    if (!user || !hasAccess) {
      setWithdrawals([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const collRef = collection(db, ...COLLECTION_PATH_RETIRADAS);
    
    // If user is not admin, filter to only their records
    const q = hasAccess && (user.email === 'enito@newlife.com.br' || user.email === 'admin@newlife.com.br' || user.email === 'enito.vgs@gmail.com')
      ? collRef
      : query(collRef, where('createdBy', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Withdrawal[];

        // Sort locally by date desc, then by createdAt desc
        list.sort((a, b) => {
          const aTime = new Date(a.date).getTime();
          const bTime = new Date(b.date).getTime();
          if (bTime === aTime) {
            return (b.createdAt || 0) - (a.createdAt || 0);
          }
          return bTime - aTime;
        });

        setWithdrawals(list);
        setDataLoading(false);
      },
      (error) => {
        console.error('Erro ao escutar banco de dados:', error);
        setDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, hasAccess]);

  // Aggregate stats from withdrawals array
  const stats = useMemo<GeneralStats>(() => {
    const total = withdrawals.length;
    let pendentes = 0;
    let avariados = 0;
    let recebidos = 0;
    
    let roteadores = 0;
    let onu = 0;
    let ont = 0;
    let conectores = 0;

    const techCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    withdrawals.forEach((w) => {
      const status = w.status || 'Pendente';
      if (status === 'Pendente') pendentes++;
      else if (status === 'Avariado') avariados++;
      else if (status === 'Recebido') recebidos++;

      // Materials totals
      if (w.materials) {
        roteadores += (w.materials['Roteador GIGA'] || 0) + (w.materials['Roteador FAST'] || 0);
        onu += w.materials['ONU'] || 0;
        ont += w.materials['ONT'] || 0;
        conectores += w.materials['Conectores'] || 0;
      }

      // Technicians counts
      if (w.technician) {
        const tech = w.technician.trim();
        techCounts[tech] = (techCounts[tech] || 0) + 1;
      }

      // Type counts
      if (w.type) {
        const t = w.type.trim();
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      }
    });

    // Top technicians list (sorted, limited to 5)
    const topTechnicians = Object.entries(techCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top types list (sorted, limited to 5)
    const topTypes = Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRetiradas: total,
      pendentesConferencia: pendentes,
      avariados,
      recebidosOk: recebidos,
      roteadores,
      onu,
      ont,
      conectores,
      topTechnicians,
      topTypes
    };
  }, [withdrawals]);

  // Extract all unique technicians list to show in form autocomplete
  const uniqueTechnicians = useMemo(() => {
    const list = new Set<string>();
    withdrawals.forEach((w) => {
      if (w.technician) list.add(w.technician.trim());
    });
    return Array.from(list).sort();
  }, [withdrawals]);

  // Handle new withdrawal form submissions
  const handleFormSubmit = async (formData: Omit<Withdrawal, 'createdAt' | 'createdBy' | 'status'>) => {
    if (!user) return;
    setSaving(true);
    try {
      const collRef = collection(db, ...COLLECTION_PATH_RETIRADAS);
      await addDoc(collRef, {
        ...formData,
        status: 'Pendente',
        createdAt: Date.now(),
        createdBy: user.uid
      });
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      alert('Erro ao salvar os dados. Verifique sua conexão e permissões do Firebase.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Update status conference
  const handleStatusUpdate = async (id: string, newStatus: Withdrawal['status']) => {
    if (!user) return;
    try {
      const docRef = doc(db, ...COLLECTION_PATH_RETIRADAS, id);
      await updateDoc(docRef, { status: newStatus });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Não foi possível atualizar o status. Verifique suas regras do Firebase.');
    }
  };

  // Delete withdrawal record
  const handleDelete = async (id: string, createdBy: string) => {
    if (!user) return;
    
    // Check permission (admins can delete any, technicians can only delete their own)
    const isOwner = createdBy === user.uid;
    const isSpecialAdmin = user.email === 'enito@newlife.com.br' || user.email === 'admin@newlife.com.br' || user.email === 'enito.vgs@gmail.com';
    
    if (!isOwner && !isSpecialAdmin) {
      alert('Você não tem permissão para excluir este registro.');
      return;
    }

    if (window.confirm('Deseja realmente excluir este registro de retirada?')) {
      try {
        const docRef = doc(db, ...COLLECTION_PATH_RETIRADAS, id);
        await deleteDoc(docRef);
      } catch (error) {
        console.error('Erro ao excluir documento:', error);
        alert('Não foi possível excluir o registro. Tente novamente.');
      }
    }
  };

  // Triggers PDF Extraction
  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await exportToPDF(withdrawals, stats);
    } finally {
      setExportingPDF(false);
    }
  };

  // Triggers CSV Extraction
  const handleExportCSV = () => {
    exportToCSV(withdrawals);
  };

  // Render Loaders
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center font-sans">
        <div className="relative flex items-center justify-center w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-brand-accent blur-2xl opacity-20 rounded-full animate-pulse" />
          <Loader2 className="w-12 h-12 text-brand-accent animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-bold italic text-white tracking-tight mb-1">new life</h2>
        <p className="text-brand-secondary flex items-center gap-2">Conectando banco...</p>
      </div>
    );
  }

  // Login Screen (If not authenticated)
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center font-sans px-4">
        <div className="bg-brand-card p-8 rounded-2xl border border-brand-border shadow-2xl max-w-sm w-full text-center space-y-6">
          
          <div className="flex flex-col items-center">
            <img src="/logo.png" alt="New Life" className="h-16 w-auto mb-3" />
            <h2 className="text-3xl font-extrabold italic text-white tracking-wide">new life</h2>
            <p className="text-xs text-brand-secondary italic mt-1">a sua nova internet</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Controle de Retiradas</h3>
            <p className="text-xs text-brand-secondary leading-relaxed">
              Faça login utilizando a sua conta Google corporativa da New Life para acessar o painel de retiradas de equipamentos.
            </p>
          </div>

          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-gray-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Entrar com o Google</span>
          </button>

        </div>
      </div>
    );
  }

  // Access Denied Screen (authenticated but unauthorized email domain)
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center font-sans px-4">
        <div className="bg-brand-card p-8 rounded-2xl border border-red-500/20 shadow-2xl max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Acesso Não Autorizado</h3>
          <p className="text-xs text-brand-secondary leading-relaxed">
            Seu e-mail ({user.email}) não possui permissão para acessar este sistema. Utilize uma conta terminando em @newlife.com.br.
          </p>
          <button
            onClick={logout}
            className="w-full bg-[#ff6868] hover:bg-[#e05858] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-colors cursor-pointer"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  // Main Authenticated Dashboard Screen
  return (
    <div className="min-h-screen bg-brand-bg font-sans text-gray-100 selection:bg-brand-accent/30 selection:text-white pb-12">
      
      {/* Navigation Header */}
      <Header 
        displayName={user.displayName}
        email={user.email}
        onLogout={logout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Title & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-white tracking-wide">Visão Geral de Retiradas</h2>
            <p className="text-sm text-brand-secondary mt-1">Monitoramento de equipamentos retirados in loco</p>
          </div>

          {/* PDF & Excel Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={saving || withdrawals.length === 0}
              className="flex items-center justify-center gap-2 bg-[#052b36] border border-brand-border hover:border-brand-accent/50 text-brand-accent px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-md hover:bg-brand-card disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              <span>Exportar Excel (CSV)</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={exportingPDF || withdrawals.length === 0}
              className="flex items-center justify-center gap-2 bg-[#052b36] border border-brand-border hover:border-brand-accent/50 text-brand-accent px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-md hover:bg-brand-card disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {exportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Documento...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Exportar Relatório PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dashboard statistics panel */}
        <div className="mb-6">
          <DashboardStats stats={stats} />
        </div>

        {/* Split grid: Form on the left/top, List on the right/bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1">
            <WithdrawalForm 
              initialTechnician={user.displayName || ''}
              techniciansList={uniqueTechnicians}
              onSubmit={handleFormSubmit}
            />
          </div>

          <div className="lg:col-span-2">
            <WithdrawalList
              withdrawals={withdrawals}
              currentUserUid={user.uid}
              isAdmin={user.email === 'enito@newlife.com.br' || user.email === 'admin@newlife.com.br' || user.email === 'enito.vgs@gmail.com'}
              onStatusUpdate={handleStatusUpdate}
              onDelete={handleDelete}
            />
          </div>

        </div>

      </main>

    </div>
  );
}
