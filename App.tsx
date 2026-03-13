
import React, { useState, useEffect, useMemo } from 'react';
import { TourType, TourRecord, Language, Currency } from './types';
import { TOUR_COLORS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES, TOUR_ICONS, CURRENCIES } from './constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Map, Wallet, Calendar, Clock, ChevronDown, Trash2, LogOut, Globe, BarChart3, History, Settings, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { analyzeRecords } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { RecordCard } from './RecordCard';
import { CustomSelect } from './src/components/CustomSelect';
import { motion, AnimatePresence } from 'motion/react';

const formatDate = (dateStr: string, lang: Language) => {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekdaysJa = ['日', '月', '火', '水', '木', '金', '土'];
  const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dow = d.getDay();
  const weekday = lang === 'ja' ? weekdaysJa[dow] : weekdaysEn[dow];
  return `${y}/${m}/${day} (${weekday})`;
};

const ADMIN_PASSWORD = '2025';
const DELETE_PIN = '0124';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ja');
  const [records, setRecords] = useState<TourRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'history' | 'settings'>('upload');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [targetTabAfterLogin, setTargetTabAfterLogin] = useState<typeof activeTab | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [cloudUrl, setCloudUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  const T = TRANSLATIONS[lang] || TRANSLATIONS.ja;
  const YEARS = [2025, 2026, 2027, 2028, 2029, 2030];
  const MONTHS_LIST = Array.from({ length: 12 }, (_, i) => i + 1);

  // 強化數據清理邏輯：過濾掉空行、0數據以及非法日期
  const cleanRecords = (raw: any[]): TourRecord[] => {
    return raw.filter(r => {
      const isValidDate = r.date && !isNaN(new Date(r.date).getTime());
      const hasValue = (Number(r.revenue) > 0 || Number(r.guests) > 0);
      return isValidDate && hasValue;
    });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const savedRecords = localStorage.getItem('tour_records');
        if (savedRecords) {
          const parsed = JSON.parse(savedRecords);
          if (Array.isArray(parsed)) setRecords(cleanRecords(parsed));
        }
        const savedUrl = localStorage.getItem('cloud_sync_url');
        if (savedUrl) setCloudUrl(savedUrl);
        const savedAuto = localStorage.getItem('auto_sync');
        if (savedAuto) setAutoSync(savedAuto === 'true');
        const savedAdmin = localStorage.getItem('is_admin');
        if (savedAdmin === 'true') setIsAdmin(true);
        setIsInitialLoadDone(true);
      } catch (e) { setIsInitialLoadDone(true); }
    };
    init();
  }, []);

  useEffect(() => { 
    if (isInitialLoadDone) localStorage.setItem('tour_records', JSON.stringify(records)); 
  }, [records, isInitialLoadDone]);

  const groupedHistoryByMonth = useMemo(() => {
    const groups: Record<string, TourRecord[]> = {};
    const validRecords = cleanRecords(records);
    const sortedRecords = [...validRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sortedRecords.forEach(r => {
      const d = new Date(r.date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [records]);

  useEffect(() => {
    const keys = Object.keys(groupedHistoryByMonth);
    if (keys.length > 0 && expandedMonths.length === 0) setExpandedMonths([keys[0]]);
  }, [groupedHistoryByMonth]);

  const performCloudSync = async (showAlert = true, overrideData?: TourRecord[]) => {
    const dataToSync = overrideData || records;
    if (!cloudUrl || !cloudUrl.startsWith('https://script.google.com')) {
      if (showAlert) alert(T.syncError);
      return;
    }
    setIsSyncing(true);
    try {
      await fetch(cloudUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'sync', data: dataToSync }) });
      const getResponse = await fetch(`${cloudUrl}?action=get`);
      const cloudData = await getResponse.json();
      if (Array.isArray(cloudData)) {
        const sanitized = cleanRecords(cloudData);
        const sorted = sanitized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecords(sorted);
        setLastSyncTime(new Date().toLocaleString('ja-JP'));
        if (showAlert) alert(T.syncSuccess);
      }
    } catch (err) { if (showAlert) alert(T.syncError); } finally { setIsSyncing(false); }
  };

  const handleDeleteRecord = (id: string) => {
    const pin = prompt(T.deletePasswordPrompt);
    if (pin === DELETE_PIN) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      if (autoSync && cloudUrl) performCloudSync(false, updated);
    } else if (pin !== null) {
      alert(T.deletePasswordError);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem('is_admin', 'true');
      setShowLogin(false);
      setPasswordInput('');
      if (targetTabAfterLogin) { setActiveTab(targetTabAfterLogin); setTargetTabAfterLogin(null); }
    } else { alert(lang === 'ja' ? 'パスワードが違います' : 'Incorrect PIN'); }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('is_admin');
    setActiveTab('upload');
  };

  const handleTabSwitch = (tab: typeof activeTab) => {
    if (!isAdmin && (tab === 'dashboard' || tab === 'history')) { 
      setTargetTabAfterLogin(tab); 
      setShowLogin(true); 
    } else { 
      setActiveTab(tab); 
    }
  };

  const monthlyData = useMemo(() => {
    const result = MONTHS_LIST.map(m => {
      const filtered = records.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === selectedYear && (d.getMonth() + 1) === m;
      });
      return { month: m, rev: filtered.reduce((acc, r) => acc + r.revenue, 0) };
    });
    const maxRev = Math.max(...result.map(d => d.rev), 1);
    return result.map((d, i) => {
      const prevRev = i > 0 ? result[i-1].rev : 0;
      const diff = d.rev - prevRev;
      const growth = prevRev === 0 ? 0 : (diff / prevRev) * 100;
      return { ...d, height: (d.rev / maxRev) * 100, diff, growth, isMax: d.rev === maxRev && d.rev > 0 };
    });
  }, [records, selectedYear]);

  const stats = useMemo(() => {
    const filtered = records.filter(r => {
      const d = new Date(r.date);
      if (selectedMonth === 'all') return d.getFullYear() === selectedYear;
      return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });
    return { rev: filtered.reduce((acc, r) => acc + r.revenue, 0), pax: filtered.reduce((acc, r) => acc + r.guests, 0), count: filtered.length, raw: filtered };
  }, [records, selectedYear, selectedMonth]);

  const [formData, setFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: TourType.GION_WALK, 
    guide: GUIDES[0], 
    revenue: '', 
    currency: 'JPY' as Currency,
    originalAmount: 0,
    guests: '1', 
    duration: 3 
  });

  const handleSaveRecord = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const originalAmount = formData.originalAmount || 0;
    const currencyInfo = CURRENCIES.find(c => c.code === formData.currency) || CURRENCIES[0];
    const jpyRevenue = Math.round(originalAmount * currencyInfo.rate);
    
    const newRecord: TourRecord = { 
      id: crypto.randomUUID(), 
      date: formData.date, 
      type: formData.type, 
      guide: formData.guide, 
      revenue: jpyRevenue,
      currency: formData.currency,
      originalAmount: originalAmount,
      guests: Number(formData.guests), 
      duration: formData.duration, 
      createdAt: Date.now() 
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    setFormData({ ...formData, revenue: '', originalAmount: 0, guests: '1', duration: 3 });
    alert(T.saveSuccess);
    if (autoSync && cloudUrl) performCloudSync(false, updated);
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden select-none" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-8 pt-14 rounded-b-[3rem] shadow-2xl z-20 bg-slate-900 text-white shrink-0 border-b border-white/10">
        <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
          <div className="flex items-center space-x-6">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20"> 
              <WonderlandLogo className="w-10 h-10 text-amber-400" /> 
            </div>
            <div>
              <h1 className="text-2xl font-serif-luxury font-light leading-none tracking-widest uppercase">WONDERLAND</h1>
              <p className="text-[10px] font-bold tracking-[0.6em] uppercase text-amber-500/80 mt-1">Japan Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             {isAdmin && (
               <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors p-2">
                 <LogOut className="w-5 h-5" />
               </button>
             )}
             <button 
               onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} 
               className="bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-white/10 transition-all"
             >
               {lang === 'ja' ? 'English' : '日本語'}
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden no-scrollbar relative z-10 w-full max-w-5xl mx-auto pb-44">
        {showLogin && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
             <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center space-y-8 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-700 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h2 className="text-2xl font-black font-washi text-slate-900 uppercase tracking-tighter">System Access</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                   <input autoFocus type="password" inputMode="numeric" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="••••" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-4xl text-center tracking-[0.5em] outline-none focus:border-red-700 shadow-inner" />
                   <div className="flex space-x-3">
                      <button type="button" onClick={() => setShowLogin(false)} className="flex-1 py-5 rounded-[2rem] font-black text-slate-400 uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl">Unlock</button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 pb-20">
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden">
               <div className="flex items-center justify-between border-b border-slate-100 pb-8 mb-10">
                <div className="flex items-center space-x-4">
                  <div className="w-1.5 h-10 bg-slate-900 rounded-full" />
                  <h2 className="text-4xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">{T.newRecord}</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Date Selection */}
                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.date}</label>
                  <div className="relative group">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input 
                      type="date" 
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})} 
                      className="w-full pl-16 pr-8 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-all" 
                    />
                  </div>
                </div>

                {/* Tour Type */}
                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.tourType}</label>
                  <CustomSelect 
                    value={formData.type}
                    onChange={(val: string) => setFormData({...formData, type: val as TourType})}
                    options={Object.values(TourType).map(t => ({
                      id: t,
                      label: T.tours?.[t] || t,
                      icon: TOUR_ICONS[t as TourType]
                    }))}
                    icon={<Map className="w-5 h-5" />}
                  />
                </div>

                {/* Guide */}
                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.guide}</label>
                  <CustomSelect 
                    value={formData.guide}
                    onChange={(val: string) => setFormData({...formData, guide: val})}
                    options={GUIDES.map(g => ({
                      id: g,
                      label: g
                    }))}
                    icon={<Users className="w-5 h-5" />}
                  />
                </div>

                {/* Guests & Duration */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.guests}</label>
                    <input 
                      type="number" 
                      value={formData.guests} 
                      onChange={e => setFormData({...formData, guests: e.target.value})} 
                      className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-all" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.duration} (h)</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={formData.duration} 
                      onChange={e => setFormData({...formData, duration: parseFloat(e.target.value)})} 
                      className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-all" 
                    />
                  </div>
                </div>

                {/* Currency & Amount */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.currency}</label>
                    <CustomSelect 
                      value={formData.currency}
                      onChange={(val: string) => setFormData({...formData, currency: val as Currency})}
                      options={CURRENCIES.map(c => ({
                        id: c.code,
                        label: `${c.code} (${c.symbol})`
                      }))}
                      icon={<Wallet className="w-5 h-5" />}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.amount}</label>
                    <div className="relative group">
                      <span className="absolute left-8 top-1/2 -translate-y-1/2 font-serif-luxury text-xl text-slate-300 group-focus-within:text-slate-900 transition-colors">
                        {CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                      </span>
                      <input 
                        type="number" 
                        value={formData.originalAmount} 
                        onChange={e => setFormData({...formData, originalAmount: parseFloat(e.target.value)})} 
                        className="w-full pl-16 pr-8 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-xl font-serif-luxury font-medium outline-none focus:border-slate-900 shadow-inner transition-all" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveRecord} 
                className="w-full mt-12 bg-slate-900 hover:bg-slate-800 text-white h-28 rounded-[3.5rem] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10 font-serif-luxury text-2xl uppercase tracking-[0.3em] group-hover:tracking-[0.4em] transition-all">
                  {T.save}
                </span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-10 pb-20">
             <div className="flex flex-wrap gap-3">
                {YEARS.map(y => (
                  <button 
                    key={y} 
                    onClick={() => setSelectedYear(y)} 
                    className={`px-8 py-3 rounded-full font-bold text-[11px] uppercase tracking-widest border transition-all ${selectedYear === y ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {y}
                  </button>
                ))}
             </div>
             
             <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden relative">
                <div className="flex justify-between items-end mb-8 h-80 px-4 relative z-10">
                  {monthlyData.map((d) => (
                    <div key={d.month} className="flex flex-col items-center flex-1 h-full justify-end relative group">
                      {d.rev > 0 && (
                        <div className="absolute bottom-[calc(height+8px)] mb-2 flex flex-col items-center z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-[10px] font-bold text-slate-900 bg-white px-2 py-1 rounded-lg shadow-xl border border-slate-100">¥{(d.rev/1000).toFixed(0)}k</span>
                        </div>
                      )}
                      
                      <div 
                        onClick={() => setSelectedMonth(d.month)} 
                        className={`w-3/5 rounded-t-full rounded-b-xl transition-all duration-700 cursor-pointer relative ${selectedMonth === d.month ? 'ring-4 ring-amber-500/30 shadow-2xl scale-110 z-10' : 'opacity-30 hover:opacity-60'} ${d.isMax ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-slate-900'}`} 
                        style={{ height: `${Math.max(d.height, 4)}%` }} 
                      />
                      <span className={`text-[10px] font-bold mt-6 uppercase tracking-widest transition-colors ${selectedMonth === d.month ? 'text-amber-600' : 'text-slate-300'}`}>{T.months[d.month].substring(0, 3)}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSelectedMonth('all')} className="w-full text-[11px] font-bold text-slate-400 border-t border-slate-50 pt-8 uppercase tracking-[0.3em] hover:text-slate-900 transition-colors">{T.viewFullYear}</button>
             </div>

             <div className="bg-slate-900 text-white p-12 rounded-[4.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5">
                  <TrendingUp className="w-48 h-48" />
                </div>
                <p className="text-amber-500 text-[11px] font-bold uppercase tracking-[0.5em] mb-8 relative z-10">
                  {selectedYear} • {selectedMonth === 'all' ? T.annualSummary : `${T.monthlyPerformance} (${T.months[selectedMonth]})`}
                </p>
                <div className="flex items-baseline space-x-4 mb-12 relative z-10">
                   <span className="text-2xl font-light text-slate-500 font-serif-luxury">¥</span>
                   <h2 className="text-6xl font-serif-luxury font-medium tracking-tight break-all">{stats.rev.toLocaleString()}</h2>
                </div>
                <div className="grid grid-cols-2 gap-6 relative z-10">
                   <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                      <p className="text-[11px] text-slate-500 font-bold mb-2 uppercase tracking-widest">{T.guests}</p>
                      <p className="text-3xl font-serif-luxury">{stats.pax}</p>
                   </div>
                   <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                      <p className="text-[11px] text-slate-500 font-bold mb-2 uppercase tracking-widest">TOURS</p>
                      <p className="text-3xl font-serif-luxury">{stats.count}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl relative space-y-10 border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-1.5 h-8 bg-amber-600 rounded-full" />
                    <h3 className="text-3xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">{T.statsTitle}</h3>
                  </div>
                  <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                
                <div className="grid grid-cols-1 gap-10">
                  <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-inner">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 ml-2">Tour Distribution</p>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(stats.raw.reduce((acc, r) => {
                              acc[r.type] = (acc[r.type] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)).map(([name, value]) => ({ name: T.tours[name] || name, value }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            {Object.keys(TOUR_COLORS).map((key, index) => (
                              <Cell key={`cell-${index}`} fill={TOUR_COLORS[key as TourType]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', padding: '1rem' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '2rem', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-inner">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 ml-2">Guide Performance (Revenue)</p>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(stats.raw.reduce((acc, r) => {
                            acc[r.guide] = (acc[r.guide] || 0) + r.revenue;
                            return acc;
                          }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                          layout="vertical"
                          margin={{ left: 20, right: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            formatter={(value: any) => `¥${Number(value).toLocaleString()}`}
                            contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', padding: '1rem' }}
                          />
                          <Bar dataKey="value" fill="#0f172a" radius={[0, 20, 20, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Analysis Section */}
                  <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sparkles className="w-32 h-32" />
                    </div>
                    <div className="flex items-center space-x-4 relative z-10">
                      <div className="bg-amber-500 p-2 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-slate-900" />
                      </div>
                      <h3 className="text-2xl font-serif-luxury font-medium uppercase tracking-widest text-amber-400">Strategic AI Report</h3>
                    </div>
                    
                    <div className="relative z-10">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center py-12 space-y-6">
                          <div className="loader !border-amber-400"></div>
                          <p className="text-amber-400 font-bold tracking-[0.3em] text-[10px] uppercase animate-pulse">{T.statsLoading}</p>
                        </div>
                      ) : aiInsight ? (
                        <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed font-light">
                          <ReactMarkdown>{aiInsight}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <p className="text-slate-500 italic text-sm mb-8">{T.statsPlaceholder}</p>
                          <button 
                            onClick={() => { setIsAnalyzing(true); setAiInsight(null); analyzeRecords(stats.raw, lang).then(setAiInsight).finally(() => setIsAnalyzing(false)); }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-10 py-5 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95"
                          >
                            {T.statsRefreshBtn}
                          </button>
                        </div>
                      )}
                    </div>

                    {aiInsight && !isAnalyzing && (
                      <button 
                        onClick={() => { setIsAnalyzing(true); setAiInsight(null); analyzeRecords(stats.raw, lang).then(setAiInsight).finally(() => setIsAnalyzing(false)); }}
                        className="w-full py-4 border-t border-white/10 text-amber-500/60 hover:text-amber-500 text-[10px] font-bold uppercase tracking-[0.3em] transition-colors mt-4"
                      >
                        Regenerate Analysis
                      </button>
                    )}
                  </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 pb-20">
            <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-slate-100">
               <div className="flex items-center justify-between border-b border-slate-100 pb-8 mb-10">
                <div className="flex items-center space-x-4">
                  <div className="w-1.5 h-10 bg-slate-900 rounded-full" />
                  <h2 className="text-4xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">{T.history}</h2>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-slate-100 px-6 py-3 rounded-full text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] border border-slate-200">{records.length} {T.records}</span>
                </div>
              </div>
              
              <div className="space-y-12">
                {Object.keys(groupedHistoryByMonth).length === 0 ? (
                  <div className="py-32 text-center space-y-6">
                    <History className="w-16 h-16 text-slate-100 mx-auto" />
                    <p className="text-slate-300 font-serif-luxury italic text-xl">{T.noRecords}</p>
                  </div>
                ) : (
                  Object.entries(groupedHistoryByMonth).map(([monthKey, monthRecords]) => {
                    if (monthKey.includes('NaN') || monthKey.includes('undefined')) return null;
                    const [y, m] = monthKey.split('-');
                    const monthIdx = parseInt(m);
                    const displayMonth = lang === 'ja' ? `${y}年 ${monthIdx}月` : `${T.months[monthIdx]} ${y}`;
                    const isExpanded = expandedMonths.includes(monthKey);
                    
                    return (
                      <div key={monthKey} className="space-y-6">
                         <button 
                           onClick={() => setExpandedMonths(prev => isExpanded ? prev.filter(k => k !== monthKey) : [...prev, monthKey])}
                           className={`w-full flex justify-between items-center px-10 py-8 rounded-[3rem] border transition-all duration-500 ${isExpanded ? 'bg-slate-900 text-white border-slate-900 shadow-2xl' : 'bg-slate-50 text-slate-900 border-slate-100 hover:bg-slate-100'}`}
                         >
                            <span className="font-serif-luxury text-2xl uppercase tracking-widest">{displayMonth}</span>
                            <div className={`p-2 rounded-full transition-transform duration-500 ${isExpanded ? 'bg-white/10 rotate-180' : 'bg-slate-200'}`}>
                              <ChevronDown className="w-5 h-5" />
                            </div>
                         </button>
                         
                         {isExpanded && (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
                             {monthRecords.map(record => (
                               <RecordCard 
                                 key={record.id} 
                                 record={record} 
                                 lang={lang} 
                                 isAdmin={isAdmin}
                                 onDelete={handleDeleteRecord} 
                               />
                             ))}
                           </div>
                         )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in zoom-in duration-500 pb-20">
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl space-y-12 flex flex-col min-h-[70vh] relative border border-slate-100">
                <div className="flex items-center space-x-4 border-b border-slate-100 pb-8">
                  <div className="w-1.5 h-10 bg-slate-900 rounded-full" />
                  <h2 className="text-4xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">{T.system}</h2>
                </div>
                
                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.cloudEndpoint}</label>
                  <div className="relative">
                    <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="https://script.google.com/..." className="w-full pl-16 pr-8 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-all" />
                  </div>
                </div>

                <button onClick={() => performCloudSync()} disabled={isSyncing} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-28 rounded-[3.5rem] shadow-2xl active:scale-[0.98] disabled:opacity-30 transition-all flex items-center justify-center group overflow-hidden relative">
                  <div className={`absolute inset-0 bg-amber-500 transition-transform duration-1000 ${isSyncing ? 'translate-x-0' : '-translate-x-full'}`} />
                  <span className="relative z-10 font-serif-luxury text-2xl uppercase tracking-[0.3em] group-hover:tracking-[0.4em] transition-all">
                    {isSyncing ? 'SYNCING...' : T.forceSync}
                  </span>
                </button>
                
                {lastSyncTime && (
                  <div className="flex items-center justify-center space-x-3 text-slate-300">
                    <Clock className="w-4 h-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">{T.lastSync}: {lastSyncTime}</p>
                  </div>
                )}
                
                <div className="mt-auto pt-20 text-center flex flex-col items-center">
                   <div className="mb-12 group">
                      <p className="text-2xl font-serif-luxury text-slate-900 uppercase tracking-[0.4em] mb-4 transition-all group-hover:tracking-[0.5em]">WONDERLAND JAPAN</p>
                      <div className="h-0.5 w-24 bg-amber-500 mx-auto rounded-full mb-6 opacity-50" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">© All Rights Reserved 2026</p>
                   </div>
                   
                   <div className="opacity-30 transition-all hover:opacity-100 duration-1000 group">
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.8em] mb-2 ml-2">CRAFTED BY</p>
                      <p className="text-5xl font-signature text-slate-400 select-none transform -rotate-2 group-hover:text-amber-600 transition-colors">Benjamin Tang</p>
                   </div>
                </div>

                {isAdmin && (
                  <button onClick={handleLogout} className="w-full py-6 mt-10 text-red-400 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100">
                    Sign Out
                  </button>
                )}
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-4rem)] max-w-xl h-24 bg-slate-900/90 backdrop-blur-2xl flex justify-around items-center rounded-full shadow-[0_40px_80px_rgba(0,0,0,0.4)] z-50 border border-white/10 px-8">
        {[
          { id: 'upload', icon: Plus, label: T.upload },
          { id: 'dashboard', icon: BarChart3, label: T.dashboard },
          { id: 'history', icon: History, label: T.history },
          { id: 'settings', icon: Settings, label: T.settings }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id as any)} 
            className={`p-5 rounded-full transition-all duration-500 relative group ${activeTab === tab.id ? 'bg-amber-500 text-slate-900 -translate-y-6 scale-125 shadow-[0_20px_40px_rgba(245,158,11,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <tab.icon className="w-7 h-7" />
            {activeTab === tab.id && (
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-bold text-amber-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {tab.label}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
