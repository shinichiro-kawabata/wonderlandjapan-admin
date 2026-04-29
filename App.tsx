
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TourType, TourRecord, Language, Currency } from './types';
import { TOUR_COLORS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES, TOUR_ICONS, CURRENCIES, DEFAULT_CLOUD_URL } from './constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Map as MapIcon, Wallet, Calendar, Clock, ChevronDown, Trash2, LogOut, Globe, BarChart3, History, Settings, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { analyzeRecords } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { RecordCard } from './RecordCard';
import { CustomSelect } from './components/CustomSelect';
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
  const [cloudUrl, setCloudUrl] = useState(DEFAULT_CLOUD_URL);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const T = TRANSLATIONS[lang] || TRANSLATIONS.ja;
  const YEARS = [2025, 2026, 2027, 2028, 2029, 2030];
  const MONTHS_LIST = Array.from({ length: 12 }, (_, i) => i + 1);

  // CSV Export Logic
  const handleExportCSV = () => {
    if (records.length === 0) return;
    setIsExporting(true);
    try {
      const headers = ['ID', 'Date', 'Type', 'Guide', 'Revenue(JPY)', 'Currency', 'OriginalAmount', 'Guests', 'Duration', 'CreatedAt'];
      const rows = records.map(r => [
        r.id,
        r.date,
        r.type,
        r.guide,
        r.revenue,
        r.currency,
        r.originalAmount,
        r.guests,
        r.duration,
        new Date(r.createdAt || Date.now()).toISOString()
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `wonderland_tours_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // CSV Import Logic
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const importedRecords: TourRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length < 5) continue;
          
          importedRecords.push({
            id: cols[0] || crypto.randomUUID(),
            date: cols[1],
            type: cols[2] as TourType,
            guide: cols[3],
            revenue: Number(cols[4]),
            currency: (cols[5] as Currency) || 'JPY',
            originalAmount: Number(cols[6] || cols[4]),
            guests: Number(cols[7] || 1),
            duration: Number(cols[8] || 3),
            createdAt: cols[9] ? new Date(cols[9]).getTime() : Date.now()
          });
        }

        const cleaned = cleanRecords(importedRecords);
        const merged: TourRecord[] = [...cleaned, ...records];
        // Remove duplicates by ID
        const unique = Array.from(new window.Map(merged.map(item => [item.id, item])).values()) as TourRecord[];
        setRecords([...unique].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        if (autoSync && cloudUrl) {
          performCloudSync(false, unique);
        }
        alert(lang === 'ja' ? 'インポート完了' : 'Import Complete');
      } catch (err) {
        alert(lang === 'ja' ? 'インポート失敗' : 'Import Failed');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

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
        else setCloudUrl(DEFAULT_CLOUD_URL);
        
        const savedAuto = localStorage.getItem('auto_sync');
        if (savedAuto) setAutoSync(savedAuto === 'true');
        else setAutoSync(true);
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
    type: TourType.GION_KLOOK, 
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
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-[#FAF9F6] selection:bg-red-100">
      <header className="px-6 py-4 md:px-12 md:py-6 shadow-sm z-30 bg-slate-900 text-white shrink-0">
        <div className="flex justify-between items-center max-w-6xl mx-auto w-full">
          <div className="flex items-center space-x-4 md:space-x-8">
            <div className="relative group cursor-pointer" onClick={() => handleTabSwitch('upload')}>
              <WonderlandLogo className="w-10 h-10 md:w-14 md:h-14 transition-luxury group-hover:scale-110" variant="red" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl md:text-2xl font-fashion font-bold leading-none tracking-[0.4em] uppercase">WONDERLAND</h1>
              <p className="text-[8px] md:text-[9px] font-bold tracking-[0.6em] uppercase text-amber-500 mt-1.5 opacity-80">JAPAN MANAGEMENT SYSTEM</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-6">
            {isSyncing && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 animate-pulse">
                <div className="loader !w-3 !h-3 !border-amber-500"></div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500 hidden md:inline">Syncing</span>
              </div>
            )}
            {isAdmin && (
               <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-luxury p-2 bg-white/5 rounded-xl border border-white/5 hover:border-white/20">
                 <LogOut className="w-4 h-4 md:w-5 h-5" />
               </button>
            )}
             <button 
               onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} 
               className="bg-white/5 hover:bg-white/10 px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-luxury hover:scale-105 active:scale-95"
             >
               {lang === 'ja' ? 'EN' : 'JP'}
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto overflow-y-auto no-scrollbar relative z-10 px-4 md:px-6 pt-6 pb-40">
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
          <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-10">
            <div className="bg-white p-6 md:p-14 lg:p-16 rounded-[2.5rem] md:rounded-[4rem] shadow-luxury border border-slate-100 relative overflow-hidden">
               <div className="flex items-center justify-between border-b border-slate-50 pb-6 md:pb-10 mb-8 md:mb-12">
                <div className="flex items-center space-x-4">
                  <div className="w-1.5 h-8 md:h-12 bg-slate-900 rounded-full" />
                  <h2 className="text-2xl md:text-4xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">{T.upload}</h2>
                </div>
                <div className="flex items-center space-x-3">
                  <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    onChange={handleImportCSV} 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-luxury border border-slate-100"
                  >
                    <span>{isImporting ? 'Importing...' : 'CSV Import'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                {/* Date Selection */}
                <div className="space-y-2 md:space-y-4">
                  <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.date}</label>
                  <div className="relative group">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input 
                      type="date" 
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})} 
                      className="w-full pl-12 md:pl-16 pr-6 md:pr-8 py-3 md:py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] text-xs md:text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-luxury" 
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
                    icon={<MapIcon className="w-5 h-5" />}
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
                      className="w-full px-6 md:px-8 py-3 md:py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] text-xs md:text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-luxury" 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block ml-2">{T.duration} (h)</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={formData.duration} 
                      onChange={e => setFormData({...formData, duration: parseFloat(e.target.value)})} 
                      className="w-full px-6 md:px-8 py-3 md:py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] text-xs md:text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-luxury" 
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
                      <span className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 font-serif-luxury text-lg md:text-xl text-slate-300 group-focus-within:text-slate-900 transition-colors">
                        {CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                      </span>
                      <input 
                        type="number" 
                        value={formData.originalAmount} 
                        onChange={e => setFormData({...formData, originalAmount: parseFloat(e.target.value)})} 
                        className="w-full pl-12 md:pl-16 pr-6 md:pr-8 py-3 md:py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] text-lg md:text-xl font-serif-luxury font-medium outline-none focus:border-slate-900 shadow-inner transition-luxury" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveRecord} 
                className="w-full mt-8 md:mt-12 bg-slate-900 hover:bg-slate-800 text-white h-20 md:h-28 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl active:scale-[0.98] transition-luxury flex items-center justify-center group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10 font-serif-luxury text-xl md:text-2xl uppercase tracking-[0.3em] group-hover:tracking-[0.4em] transition-all">
                  {T.save}
                </span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-right-10">
             <div className="flex flex-wrap gap-2 md:gap-4 overflow-x-auto no-scrollbar py-2">
                {YEARS.map(y => (
                  <button 
                    key={y} 
                    onClick={() => setSelectedYear(y)} 
                    className={`px-6 md:px-10 py-2.5 md:py-3.5 rounded-full font-bold text-[10px] md:text-[11px] uppercase tracking-widest border transition-luxury whitespace-nowrap ${selectedYear === y ? 'bg-slate-900 text-white border-slate-900 shadow-luxury scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {y}
                  </button>
                ))}
             </div>
             
             <div className="bg-white p-8 md:p-14 lg:p-16 rounded-[2.5rem] md:rounded-[4.5rem] shadow-luxury border border-slate-100 relative">
                <div className="flex justify-between items-end mb-8 md:mb-14 h-64 md:h-96 px-2 md:px-6 relative z-10 border-b border-slate-50">
                  {monthlyData.map((d) => (
                    <div key={d.month} className="flex flex-col items-center flex-1 h-full justify-end relative group px-1">
                      {d.rev > 0 && (
                        <div className="absolute bottom-[calc(height+12px)] mb-2 flex flex-col items-center z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-luxury">
                           <span className="text-[10px] font-bold text-slate-900 bg-white px-3 py-1.5 rounded-xl shadow-luxury border border-slate-100 whitespace-nowrap">¥{(d.rev/1000).toFixed(0)}k</span>
                        </div>
                      )}
                      
                      <div 
                        onClick={() => setSelectedMonth(d.month)} 
                        className={`w-full max-w-[40px] rounded-t-2xl rounded-b-lg transition-luxury cursor-pointer relative ${selectedMonth === d.month ? 'ring-4 ring-amber-500/20 shadow-luxury scale-110 z-10' : 'opacity-20 hover:opacity-100'} ${d.isMax ? 'bg-gradient-to-t from-red-800 to-red-600' : 'bg-slate-900'}`} 
                        style={{ height: `${Math.max(d.height, 4)}%` }} 
                      />
                      <span className={`text-[9px] md:text-[10px] font-bold mt-4 md:mt-8 uppercase tracking-widest transition-luxury ${selectedMonth === d.month ? 'text-slate-900 bg-amber-400/20 px-2 py-0.5 rounded-full' : 'text-slate-400'}`}>{T.months[d.month].substring(0, 3)}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSelectedMonth('all')} className="w-full text-[10px] font-bold text-slate-400 pt-8 uppercase tracking-[0.4em] hover:text-slate-900 transition-luxury group flex items-center justify-center space-x-4">
                  <div className="h-0.5 flex-1 bg-slate-50 group-hover:bg-slate-100" />
                  <span>{T.viewFullYear}</span>
                  <div className="h-0.5 flex-1 bg-slate-50 group-hover:bg-slate-100" />
                </button>
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

             <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl relative space-y-8 md:space-y-10 border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 md:pb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-1.5 h-6 md:h-8 bg-amber-600 rounded-full" />
                    <h3 className="text-xl md:text-3xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">{T.statsTitle}</h3>
                  </div>
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-amber-500 animate-pulse" />
                </div>
                
                <div className="grid grid-cols-1 gap-6 md:gap-10">
                  <div className="bg-slate-50 p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-inner">
                    <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 md:mb-6 ml-2">Tour Distribution</p>
                    <div className="h-64 md:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(stats.raw.reduce((acc, r) => {
                              acc[r.type] = (acc[r.type] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)).map(([name, value]) => ({ name: T.tours[name] || name, value }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            {Object.keys(TOUR_COLORS).map((key, index) => (
                              <Cell key={`cell-${index}`} fill={TOUR_COLORS[key as TourType]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', padding: '0.75rem', fontSize: '12px' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '1rem', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-inner">
                    <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 md:mb-6 ml-2">Guide Performance (Revenue)</p>
                    <div className="h-64 md:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(stats.raw.reduce((acc, r) => {
                            acc[r.guide] = (acc[r.guide] || 0) + r.revenue;
                            return acc;
                          }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                          layout="vertical"
                          margin={{ left: 10, right: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            formatter={(value: any) => `¥${Number(value).toLocaleString()}`}
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', padding: '0.75rem', fontSize: '12px' }}
                          />
                          <Bar dataKey="value" fill="#0f172a" radius={[0, 20, 20, 0]} barSize={20} />
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
          <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-10">
            <div className="bg-white p-6 md:p-14 lg:p-16 rounded-[2.5rem] md:rounded-[4.5rem] shadow-luxury border border-slate-100">
               <div className="flex items-center justify-between border-b border-slate-50 pb-8 md:pb-12 mb-8 md:mb-14">
                <div className="flex items-center space-x-4">
                  <div className="w-1.5 h-10 md:h-14 bg-slate-900 rounded-full" />
                  <h2 className="text-3xl md:text-5xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">{T.history}</h2>
                </div>
                <button 
                  onClick={handleExportCSV}
                  disabled={isExporting || records.length === 0}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 md:px-10 py-3 md:py-4 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-luxury transition-luxury disabled:opacity-30 active:scale-95"
                >
                  {isExporting ? 'Exporting...' : T.exportCSV}
                </button>
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
          <div className="space-y-6 md:space-y-12 animate-in zoom-in-95 duration-500">
             <div className="bg-white p-8 md:p-16 lg:p-20 rounded-[3rem] md:rounded-[5rem] shadow-luxury space-y-10 border border-slate-50 relative">
                <div className="flex items-center space-x-6 border-b border-slate-50 pb-8 md:pb-12">
                  <div className="w-1.5 h-12 md:h-16 bg-slate-900 rounded-full" />
                  <h2 className="text-4xl md:text-6xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">{T.system}</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
                  <div className="space-y-6">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] block ml-4">{T.cloudEndpoint}</label>
                    <div className="relative group">
                      <Globe className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-slate-900 transition-luxury" />
                      <input 
                        type="text" 
                        value={cloudUrl} 
                        onChange={e => {
                          setCloudUrl(e.target.value);
                          localStorage.setItem('cloud_sync_url', e.target.value);
                        }} 
                        placeholder="https://script.google.com/..." 
                        className="w-full pl-20 pr-10 py-6 md:py-8 bg-slate-50 border border-slate-100 rounded-[3rem] text-sm font-bold outline-none focus:border-slate-900 shadow-inner transition-luxury" 
                      />
                    </div>
                    <div className="flex items-center justify-between px-6 pt-4">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{T.autoSync}</p>
                       <button 
                         onClick={() => {
                           const newVal = !autoSync;
                           setAutoSync(newVal);
                           localStorage.setItem('auto_sync', String(newVal));
                         }}
                         className={`w-16 h-8 rounded-full p-1 transition-luxury ${autoSync ? 'bg-slate-900' : 'bg-slate-200'}`}
                       >
                         <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-luxury transform ${autoSync ? 'translate-x-8' : 'translate-x-0'}`} />
                       </button>
                    </div>
                  </div>

                  <div className="space-y-8 flex flex-col justify-end">
                    <button 
                      onClick={() => performCloudSync()} 
                      disabled={isSyncing} 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white h-24 md:h-32 rounded-[3.5rem] shadow-luxury active:scale-[0.98] disabled:opacity-30 transition-luxury flex items-center justify-center group overflow-hidden relative"
                    >
                      <div className={`absolute inset-0 bg-red-600 transition-transform duration-1000 ${isSyncing ? 'translate-x-0' : '-translate-x-full'}`} />
                      <span className="relative z-10 font-serif-luxury text-2xl md:text-3xl uppercase tracking-[0.4em] group-hover:tracking-[0.5em] transition-luxury">
                        {isSyncing ? 'SYNCING...' : T.forceSync}
                      </span>
                    </button>
                    
                    {lastSyncTime && (
                      <div className="flex items-center justify-center space-x-4 text-slate-300">
                        <Clock className="w-5 h-5" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">{T.lastSync}: {lastSyncTime}</p>
                      </div>
                    )}
                  </div>
                </div>
                
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

      <nav className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-fit min-w-[320px] max-w-xl h-20 md:h-24 glass flex justify-around md:justify-center items-center rounded-full shadow-luxury z-50 px-4 md:px-12 md:gap-x-12 ring-1 ring-white/20">
        {[
          { id: 'upload', icon: Plus, label: T.upload },
          { id: 'dashboard', icon: BarChart3, label: T.dashboard },
          { id: 'history', icon: History, label: T.history },
          { id: 'settings', icon: Settings, label: T.settings }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id as any)} 
            className={`p-5 rounded-full transition-luxury relative group w-14 h-14 md:w-16 md:h-16 flex items-center justify-center ${activeTab === tab.id ? 'bg-slate-900 text-white -translate-y-6 scale-125 shadow-luxury' : 'text-slate-400 hover:text-slate-900 hover:bg-black/5'}`}
          >
            <tab.icon className="w-6 h-6 md:w-7 md:h-7" />
            <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center transition-luxury duration-500 ${activeTab === tab.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <span className="text-[9px] font-bold text-slate-900 uppercase tracking-[0.3em] whitespace-nowrap bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-luxury border border-slate-100">
                {tab.label}
              </span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
