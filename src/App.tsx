/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  CalendarDays, 
  DollarSign, 
  Settings, 
  Plus, 
  Search, 
  PawPrint, 
  LogOut, 
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  MoreVertical,
  Menu,
  X
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment
} from './firebase';

// --- Types ---
type View = 'dashboard' | 'customers' | 'inventory' | 'appointments' | 'sales';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  createdAt: any;
}

interface Pet {
  id: string;
  customerId: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  salePrice: number;
  supplier?: string;
}

interface Appointment {
  id: string;
  customerId: string;
  petId: string;
  serviceType: string;
  date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
}

interface Sale {
  id: string;
  customerId?: string;
  items: any[];
  total: number;
  date: string;
}

// --- App Component ---
export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState<'customer' | 'inventory' | 'appointment' | 'sale' | 'pet' | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Erro completo do Firebase:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Login cancelado pelo usuário.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("Este domínio não está autorizado no Firebase. Adicione '" + window.location.hostname + "' aos domínios autorizados no Console do Firebase.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError("O login com Google não está ativado no Console do Firebase.");
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError("O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.");
      } else {
        setLoginError("Erro ao entrar: " + (error.message || "Erro desconhecido"));
      }
    }
  };

  // Auth Listener
  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        const { getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Conexão com Firestore estabelecida com sucesso.");
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Erro de conexão: O cliente está offline ou o domínio não está autorizado.");
          setLoginError("Erro de conexão com o banco de dados. Verifique se o domínio está autorizado.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if user is admin (for ERP access)
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            // Default to admin for the creator (guilherme.a.silva@ufv.br)
            const role = currentUser.email === 'guilherme.a.silva@ufv.br' ? 'admin' : 'client';
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              role: role
            });
          }
        } catch (err) {
          console.error("Error checking user role:", err);
        }
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    });

    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });

    const unsubSales = onSnapshot(collection(db, 'sales'), (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    });

    const unsubPets = onSnapshot(collection(db, 'pets'), (snap) => {
      setPets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pet)));
    });

    return () => {
      unsubCustomers();
      unsubInventory();
      unsubAppointments();
      unsubSales();
      unsubPets();
    };
  }, [user]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#F5F5F5]">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <PawPrint className="w-8 h-8 text-[#16a34a]" />
      </motion.div>
    </div>
  );

  if (!user) return (
    <div className="h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
      <div className="bg-white p-8 md:p-12 rounded-[32px] shadow-xl max-w-md w-full text-center border border-black/5">
        <div className="bg-[#16a34a] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg border-4 border-slate-200">
          <PawPrint className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-serif mb-1 text-slate-900">Silva's Pets</h1>
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4">Banho e Tosa</p>
        <p className="text-[#6A6A50] mb-8 text-sm">Acesse o sistema de gestão interna do seu pet shop.</p>
        {loginError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
            {loginError}
          </div>
        )}
        <button 
          onClick={handleLogin}
          className="w-full bg-[#16a34a] text-white py-4 rounded-2xl font-bold hover:bg-[#15803d] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          Entrar com Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#F5F5F5] text-[#141414] font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-black/5 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="bg-[#16a34a] p-2 rounded-full border-2 border-slate-200">
              <PawPrint className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base leading-none">Silva's Pets</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-500">Banho e Tosa</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavButton active={currentView === 'customers'} onClick={() => { setCurrentView('customers'); setIsSidebarOpen(false); }} icon={<Users size={20} />} label="Clientes (CRM)" />
          <NavButton active={currentView === 'inventory'} onClick={() => { setCurrentView('inventory'); setIsSidebarOpen(false); }} icon={<Package size={20} />} label="Estoque (ERP)" />
          <NavButton active={currentView === 'appointments'} onClick={() => { setCurrentView('appointments'); setIsSidebarOpen(false); }} icon={<CalendarDays size={20} />} label="Agendamentos" />
          <NavButton active={currentView === 'sales'} onClick={() => { setCurrentView('sales'); setIsSidebarOpen(false); }} icon={<DollarSign size={20} />} label="Vendas" />
        </nav>

        <div className="p-4 border-t border-black/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F5] mb-4">
            <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-[#6A6A50] truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-2 text-sm text-red-600 font-medium p-2 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-black/5 p-4 md:p-6 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu size={20} />
            </button>
            <h2 className="text-lg md:text-xl font-serif capitalize truncate">
              {currentView === 'dashboard' ? 'Visão Geral' : 
               currentView === 'customers' ? 'Clientes' :
               currentView === 'inventory' ? 'Estoque' :
               currentView === 'appointments' ? 'Agendamentos' : 'Vendas'}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A50] w-4 h-4" />
              <input type="text" placeholder="Pesquisar..." className="bg-[#F5F5F5] border-none rounded-xl pl-10 pr-4 py-2 text-sm w-40 md:w-64 focus:ring-2 focus:ring-[#16a34a] outline-none" />
            </div>
            <button className="bg-[#16a34a] text-white p-2 rounded-xl hover:bg-[#15803d] transition-colors shadow-sm">
              <Plus size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && <DashboardView customers={customers} inventory={inventory} appointments={appointments} sales={sales} />}
            {currentView === 'customers' && <CustomersView customers={customers} pets={pets} onAdd={() => setShowModal('customer')} onManagePets={(id) => { setSelectedCustomerId(id); setShowModal('pet'); }} />}
            {currentView === 'inventory' && <InventoryView inventory={inventory} onAdd={() => setShowModal('inventory')} />}
            {currentView === 'appointments' && <AppointmentsView appointments={appointments} customers={customers} onAdd={() => setShowModal('appointment')} />}
            {currentView === 'sales' && <SalesView sales={sales} customers={customers} onAdd={() => setShowModal('sale')} />}
          </AnimatePresence>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showModal === 'customer' && (
            <CustomerModal onClose={() => setShowModal(null)} />
          )}
          {showModal === 'inventory' && (
            <InventoryModal onClose={() => setShowModal(null)} />
          )}
          {showModal === 'appointment' && (
            <AppointmentModal customers={customers} pets={pets} onClose={() => setShowModal(null)} />
          )}
          {showModal === 'sale' && (
            <SaleModal inventory={inventory} customers={customers} onClose={() => setShowModal(null)} />
          )}
          {showModal === 'pet' && selectedCustomerId && (
            <PetModal customerId={selectedCustomerId} customerName={customers.find(c => c.id === selectedCustomerId)?.name || ''} pets={pets.filter(p => p.customerId === selectedCustomerId)} onClose={() => { setShowModal(null); setSelectedCustomerId(null); }} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-[#16a34a] text-white shadow-md shadow-[#16a34a]/20' : 'text-[#6A6A50] hover:bg-[#F5F5F5] hover:text-[#141414]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DashboardView({ customers, inventory, appointments, sales }: { customers: any[], inventory: any[], appointments: any[], sales: any[] }) {
  const lowStock = inventory.filter(i => i.quantity < 5).length;
  
  const monthlyRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const todayAppointments = appointments.filter(a => {
    const today = new Date().toISOString().split('T')[0];
    return a.date.startsWith(today);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total de Clientes" value={customers.length} icon={<Users className="text-blue-600" />} trend="+12% este mês" />
        <StatCard label="Itens em Estoque" value={inventory.reduce((acc, i) => acc + i.quantity, 0)} icon={<Package className="text-orange-600" />} trend="Estável" />
        <StatCard label="Receita Total" value={`R$ ${monthlyRevenue.toLocaleString()}`} icon={<DollarSign className="text-green-600" />} trend="+8% vs anterior" />
        <StatCard label="Alertas de Estoque" value={lowStock} icon={<AlertTriangle className="text-red-600" />} trend="Ação necessária" color={lowStock > 0 ? 'text-red-600' : 'text-green-600'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <h3 className="font-serif text-lg mb-6">Agendamentos de Hoje</h3>
          <div className="space-y-4">
            {todayAppointments.length > 0 ? todayAppointments.map(a => (
              <div key={a.id} className="flex items-center justify-between p-4 bg-[#FDFCF8] rounded-2xl border border-black/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#16a34a]/10 flex items-center justify-center">
                    <Clock size={18} className="text-[#16a34a]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{a.serviceType}</p>
                    <p className="text-xs text-[#6A6A50]">Cliente: {customers.find(c => c.id === a.customerId)?.name || 'Desconhecido'}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#16a34a]">{new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )) : (
              <p className="text-sm text-[#6A6A50] text-center py-8">Nenhum agendamento para hoje.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <h3 className="font-serif text-lg mb-6">Estoque Crítico</h3>
          <div className="space-y-4">
            {inventory.filter(i => i.quantity < 5).slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex items-center gap-4">
                  <Package size={18} className="text-red-600" />
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-red-600">Apenas {item.quantity} unidades</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-red-700 underline">Repor</button>
              </div>
            ))}
            {lowStock === 0 && <p className="text-sm text-[#6A6A50] text-center py-8">Tudo em ordem com o estoque!</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon, trend, color = 'text-[#141414]' }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-2xl bg-[#F5F5F5]">{icon}</div>
        <span className="text-[10px] font-bold text-[#6A6A50] uppercase tracking-wider">{trend}</span>
      </div>
      <p className="text-xs text-[#6A6A50] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function CustomersView({ customers, pets, onAdd, onManagePets }: { customers: any[], pets: Pet[], onAdd: () => void, onManagePets: (id: string) => void }) {
  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        console.error("Error deleting customer:", err);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-serif text-lg">Base de Clientes</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="p-2 rounded-lg hover:bg-[#F5F5F5]"><Filter size={18} /></button>
          <button 
            onClick={onAdd}
            className="flex-1 sm:flex-none bg-[#16a34a] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#FDFCF8] text-[10px] font-bold uppercase tracking-widest text-[#6A6A50] border-b border-black/5">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Contato</th>
              <th className="px-6 py-4">Pets</th>
              <th className="px-6 py-4">Última Visita</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {customers.map(c => {
              const customerPets = pets.filter(p => p.customerId === c.id);
              return (
                <tr key={c.id} className="hover:bg-[#FDFCF8] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-[#6A6A50]">{c.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">{c.phone}</td>
                  <td className="px-6 py-4">
                    <div className="flex -space-x-2">
                      {customerPets.length > 0 ? customerPets.map(p => (
                        <div key={p.id} className="w-8 h-8 rounded-full bg-[#5A5A40] border-2 border-white flex items-center justify-center text-[10px] text-white font-bold uppercase" title={p.name}>
                          {p.name[0]}
                        </div>
                      )) : (
                        <span className="text-xs text-[#6A6A50] italic">Nenhum pet</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-[#6A6A50]">12/03/2024</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onManagePets(c.id)}
                        className="p-2 hover:bg-[#16a34a]/10 rounded-lg text-[#16a34a]"
                        title="Gerenciar Pets"
                      >
                        <PawPrint size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      >
                        <LogOut size={16} className="rotate-180" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#6A6A50] text-sm italic">Nenhum cliente cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function InventoryView({ inventory, onAdd }: { inventory: any[], onAdd: () => void }) {
  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este item do estoque?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (err) {
        console.error("Error deleting item:", err);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-serif text-lg">Controle de Estoque</h3>
        <button 
          onClick={onAdd}
          className="w-full sm:w-auto bg-[#16a34a] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Adicionar Item
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#FDFCF8] text-[10px] font-bold uppercase tracking-widest text-[#6A6A50] border-b border-black/5">
              <th className="px-6 py-4">Produto</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Quantidade</th>
              <th className="px-6 py-4">Preço Venda</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {inventory.map(i => (
              <tr key={i.id} className="hover:bg-[#FDFCF8] transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold">{i.name}</p>
                  <p className="text-xs text-[#6A6A50]">{i.category}</p>
                </td>
                <td className="px-6 py-4 text-xs font-mono">{i.sku}</td>
                <td className="px-6 py-4 text-sm font-bold">{i.quantity}</td>
                <td className="px-6 py-4 text-sm">R$ {i.salePrice.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      i.quantity > 10 ? 'bg-green-100 text-green-700' : 
                      i.quantity > 0 ? 'bg-orange-100 text-orange-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {i.quantity > 10 ? 'Em Estoque' : i.quantity > 0 ? 'Baixo' : 'Esgotado'}
                    </span>
                    <button onClick={() => handleDelete(i.id)} className="p-1 text-red-400 hover:text-red-600">
                      <LogOut size={14} className="rotate-180" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {inventory.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#6A6A50] text-sm italic">Nenhum item no inventário.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function AppointmentsView({ appointments, customers, onAdd }: { appointments: Appointment[], customers: Customer[], onAdd: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-serif text-lg">Agenda de Serviços</h3>
        <button 
          onClick={onAdd}
          className="w-full sm:w-auto bg-[#16a34a] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Novo Agendamento
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#FDFCF8] text-[10px] font-bold uppercase tracking-widest text-[#6A6A50] border-b border-black/5">
              <th className="px-6 py-4">Serviço</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Data/Hora</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {appointments.map(a => (
              <tr key={a.id} className="hover:bg-[#FDFCF8] transition-colors">
                <td className="px-6 py-4 font-bold text-sm">{a.serviceType}</td>
                <td className="px-6 py-4 text-sm">{customers.find(c => c.id === a.customerId)?.name || 'Desconhecido'}</td>
                <td className="px-6 py-4 text-sm">{new Date(a.date).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    a.status === 'completed' ? 'bg-green-100 text-green-700' :
                    a.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    a.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold">R$ {a.price.toFixed(2)}</td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#6A6A50] text-sm italic">Nenhum agendamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function SalesView({ sales, customers, onAdd }: { sales: Sale[], customers: Customer[], onAdd: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-serif text-lg">Histórico de Vendas</h3>
        <button 
          onClick={onAdd}
          className="w-full sm:w-auto bg-[#16a34a] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Nova Venda
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#FDFCF8] text-[10px] font-bold uppercase tracking-widest text-[#6A6A50] border-b border-black/5">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Itens</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {sales.map(s => (
              <tr key={s.id} className="hover:bg-[#FDFCF8] transition-colors">
                <td className="px-6 py-4 text-sm">{new Date(s.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm">{customers.find(c => c.id === s.customerId)?.name || 'Consumidor Final'}</td>
                <td className="px-6 py-4 text-sm">{s.items.length} itens</td>
                <td className="px-6 py-4 text-sm font-bold">R$ {s.total.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <button className="p-2 hover:bg-[#F5F5F5] rounded-lg"><MoreVertical size={16} /></button>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#6A6A50] text-sm italic">Nenhuma venda registrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function CustomerModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'customers'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error("Error adding customer:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
        <h3 className="text-2xl font-serif mb-6">Novo Cliente</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Nome Completo</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Email</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Telefone</label>
            <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Endereço</label>
            <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none h-24" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-[#6A6A50] hover:bg-[#F5F5F5] transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 bg-[#16a34a] text-white py-3 rounded-xl font-bold hover:bg-[#15803d] transition-colors">Salvar</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function InventoryModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({ 
    name: '', sku: '', category: '', quantity: 0, minQuantity: 5, costPrice: 0, salePrice: 0, supplier: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventory'), {
        ...formData,
        quantity: Number(formData.quantity),
        minQuantity: Number(formData.minQuantity),
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice),
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error("Error adding item:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-serif mb-6">Novo Item de Estoque</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Nome do Produto</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">SKU</label>
            <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Categoria</label>
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none">
              <option value="">Selecione...</option>
              <option value="Alimentos">Alimentos</option>
              <option value="Acessórios">Acessórios</option>
              <option value="Higiene">Higiene</option>
              <option value="Medicamentos">Medicamentos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Quantidade Inicial</label>
            <input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Estoque Mínimo</label>
            <input required type="number" value={formData.minQuantity} onChange={e => setFormData({...formData, minQuantity: parseInt(e.target.value)})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Preço de Custo (R$)</label>
            <input required type="number" step="0.01" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value)})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Preço de Venda (R$)</label>
            <input required type="number" step="0.01" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value)})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Fornecedor</label>
            <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div className="md:col-span-2 flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-[#6A6A50] hover:bg-[#F5F5F5] transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 bg-[#16a34a] text-white py-3 rounded-xl font-bold hover:bg-[#15803d] transition-colors">Salvar Item</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AppointmentModal({ customers, pets, onClose }: { customers: Customer[], pets: Pet[], onClose: () => void }) {
  const [formData, setFormData] = useState({ 
    customerId: '', petId: '', serviceType: '', date: '', status: 'pending' as const, price: 0 
  });

  const customerPets = pets.filter(p => p.customerId === formData.customerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'appointments'), {
        ...formData,
        price: Number(formData.price),
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error("Error adding appointment:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
        <h3 className="text-2xl font-serif mb-6">Novo Agendamento</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Cliente</label>
            <select required value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value, petId: ''})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none">
              <option value="">Selecione o Cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Pet</label>
            <select required value={formData.petId} onChange={e => setFormData({...formData, petId: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" disabled={!formData.customerId}>
              <option value="">Selecione o Pet</option>
              {customerPets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Serviço</label>
            <select required value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none">
              <option value="">Selecione o Serviço</option>
              <option value="Banho">Banho</option>
              <option value="Tosa">Tosa</option>
              <option value="Banho e Tosa">Banho e Tosa</option>
              <option value="Higiene Bucal">Higiene Bucal</option>
              <option value="Corte de Unhas">Corte de Unhas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Data e Hora</label>
            <input required type="datetime-local" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Preço (R$)</label>
            <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-[#6A6A50] hover:bg-[#F5F5F5] transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 bg-[#16a34a] text-white py-3 rounded-xl font-bold hover:bg-[#15803d] transition-colors">Agendar</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SaleModal({ inventory, customers, onClose }: { inventory: InventoryItem[], customers: Customer[], onClose: () => void }) {
  const [selectedItems, setSelectedItems] = useState<{itemId: string, quantity: number, price: number}[]>([]);
  const [customerId, setCustomerId] = useState('');

  const total = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const addItem = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    setSelectedItems([...selectedItems, { itemId, quantity: 1, price: item.salePrice }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    try {
      // Record the sale
      await addDoc(collection(db, 'sales'), {
        customerId: customerId || null,
        items: selectedItems,
        total,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });

      // Update inventory quantities
      for (const item of selectedItems) {
        const itemRef = doc(db, 'inventory', item.itemId);
        await updateDoc(itemRef, {
          quantity: increment(-item.quantity)
        });
      }

      onClose();
    } catch (err) {
      console.error("Error recording sale:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl">
        <h3 className="text-2xl font-serif mb-6">Nova Venda</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Cliente (Opcional)</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none">
                <option value="">Consumidor Final</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[#6A6A50] mb-1">Adicionar Produto</label>
              <select onChange={e => addItem(e.target.value)} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" value="">
                <option value="">Selecione um produto...</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (Estoque: {i.quantity})</option>)}
              </select>
            </div>
          </div>

          <div className="bg-[#FDFCF8] rounded-2xl border border-black/5 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F5F5] text-[10px] font-bold uppercase text-[#6A6A50]">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Qtd</th>
                  <th className="px-4 py-2">Preço</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {selectedItems.map((item, idx) => {
                  const invItem = inventory.find(i => i.id === item.itemId);
                  return (
                    <tr key={idx}>
                      <td className="px-4 py-2">{invItem?.name}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">R$ {item.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-bold">R$ {(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  );
                })}
                {selectedItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#6A6A50] italic">Nenhum item adicionado.</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-[#F5F5F5] font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right">TOTAL</td>
                  <td className="px-4 py-3 text-right text-lg">R$ {total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-[#6A6A50] hover:bg-[#F5F5F5] transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 bg-[#16a34a] text-white py-3 rounded-xl font-bold hover:bg-[#15803d] transition-colors" disabled={selectedItems.length === 0}>Finalizar Venda</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PetModal({ customerId, customerName, pets, onClose }: { customerId: string, customerName: string, pets: Pet[], onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', species: '', breed: '', age: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'pets'), {
        ...formData,
        customerId,
        createdAt: serverTimestamp()
      });
      setFormData({ name: '', species: '', breed: '', age: 0 });
    } catch (err) {
      console.error("Error adding pet:", err);
    }
  };

  const handleDeletePet = async (id: string) => {
    if (window.confirm('Remover este pet?')) {
      try {
        await deleteDoc(doc(db, 'pets', id));
      } catch (err) {
        console.error("Error deleting pet:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-serif">Pets de {customerName}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F5F5F5] rounded-full">
            <Plus className="rotate-45" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-bold uppercase text-[#6A6A50] mb-4">Adicionar Novo Pet</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Nome do Pet" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
              <select required value={formData.species} onChange={e => setFormData({...formData, species: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none">
                <option value="">Espécie</option>
                <option value="Cão">Cão</option>
                <option value="Gato">Gato</option>
                <option value="Pássaro">Pássaro</option>
                <option value="Outro">Outro</option>
              </select>
              <input placeholder="Raça" value={formData.breed} onChange={e => setFormData({...formData, breed: e.target.value})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
              <input type="number" placeholder="Idade" value={formData.age} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} className="w-full bg-[#F5F5F5] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#16a34a] outline-none" />
              <button type="submit" className="w-full bg-[#16a34a] text-white py-3 rounded-xl font-bold hover:bg-[#15803d] transition-colors flex items-center justify-center gap-2">
                <Plus size={18} /> Adicionar Pet
              </button>
            </form>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase text-[#6A6A50] mb-4">Pets Cadastrados</h4>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {pets.map(p => (
                <div key={p.id} className="p-4 bg-[#FDFCF8] rounded-2xl border border-black/5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#16a34a]/10 flex items-center justify-center">
                    <PawPrint size={20} className="text-[#16a34a]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-[#6A6A50]">{p.species} • {p.breed || 'SRD'}</p>
                  </div>
                  <button 
                    onClick={() => handleDeletePet(p.id)}
                    className="ml-auto p-2 text-red-300 hover:text-red-500"
                  >
                    <Plus className="rotate-45 w-4 h-4" />
                  </button>
                </div>
              ))}
              {pets.length === 0 && <p className="text-sm text-[#6A6A50] italic text-center py-8">Nenhum pet cadastrado.</p>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
