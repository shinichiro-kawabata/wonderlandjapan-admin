
import React, { useState, useEffect, useMemo } from 'react';
import { TourType, TourRecord, Language } from './types';
import { TOUR_COLORS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES, TOUR_ICONS } from './constants';
import { analyzeRecords } from './services/geminiService';

// --- RecordCard Component ---
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

const RecordCardInternal: React.FC<{ record: TourRecord; lang: Language; onDelete: (id: string) => void; isAdmin?: boolean }> = ({ record, lang, onDelete, isAdmin = false }) => {
  const T = TRANSLATIONS[lang] || TRANSLATIONS.ja;
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-md border border-white/50 p-5 mb-4 flex items-center justify-between transition-all active:scale-[0.98]">
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <div className="p-3.5 rounded-2xl text-white shadow-sm flex-shrink-0" style={{ backgroundColor: TOUR_COLORS[record.type] }}>
          {TOUR_ICONS[record.type]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 text-sm font-washi truncate">
            {T.tours?.[record.type] || record.type}
          </h4>
          <div className="flex items-center space-x-2 mt-0.5">
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{formatDate(record.date, lang)}</p>
             <span className="text-[8px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded-full font-black border border-amber-100">
               {record.guide}
             </span>
          </div>
          <div className="flex gap-2 mt-2">
            {isAdmin && (
              <span className="text-[9px] bg-white px-2.5 py-1 rounded-lg text-slate-800 font-black border border-slate-100">
                ¥{record.revenue.toLocaleString()}
              </span>
            )}
            <span className="text-[9px] bg-white px-2.5 py-1 rounded-lg text-slate-800 font-black border border-slate-100">
              {record.guests} {T.guestUnit}
            </span>
          </div>
        </div>
      </div>
      {isAdmin && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="p-3 text-slate-300 hover:text-red-500 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </div>
  );
};

// --- Main App Component ---
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
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    const init = async () => {
      try {
        const savedRecords = localStorage.getItem('tour_records');
        if (savedRecords) {
          const parsed = JSON.parse(savedRecords);
          if (Array.isArray(parsed)) setRecords(parsed);
        }
        const savedUrl = localStorage.getItem('cloud_sync_url');
        if (savedUrl) setCloudUrl(savedUrl);
        const savedAuto = localStorage.getItem('auto_sync');
        if (savedAuto) setAutoSync(savedAuto === 'true');
        const savedAdmin = localStorage.getItem('is_admin');
        if (savedAdmin === 'true') setIsAdmin(true);
        setIsInitialLoadDone(true);
      } catch (e) {
        setIsInitialLoadDone(true);
      }
    };
    init();
  }, []);

  useEffect(() => { 
    if (isInitialLoadDone) localStorage.setItem('tour_records', JSON.stringify(records)); 
  }, [records, isInitialLoadDone]);

  // 分組紀錄
  const groupedHistory = useMemo(() => {
    const groups: Record<string, TourRecord[]> = {};
    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sortedRecords.forEach(r => {
      const key = r.date.substring(0, 7); // YYYY-MM
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [records]);

  // 預設展開最新月份
  useEffect(() => {
    const keys = Object.keys(groupedHistory);
    if (keys.length > 0 && expandedMonths.length === 0) {
      setExpandedMonths([keys[0]]);
    }
  }, [groupedHistory]);

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
        const sorted = cloudData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecords(sorted);
        setLastSyncTime(new Date().toLocaleString('ja-JP'));
        if (showAlert) alert(T.syncSuccess);
      }
    } catch (err) { if (showAlert) alert(T.syncError); } finally { setIsSyncing(false); }
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
    // 權限更新：只有 dashboard 和 history 需要管理者權限
    if (!isAdmin && (tab === 'dashboard' || tab === 'history')) { 
      setTargetTabAfterLogin(tab); 
      setShowLogin(true); 
    } else { 
      setActiveTab(tab); 
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const pin = prompt(T.deletePasswordPrompt);
    if (pin === DELETE_PIN) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      if (cloudUrl) await performCloudSync(false, updated);
    }
  };

  const monthlyData = useMemo(() => {
    const result = MONTHS.map(m => {
      const filtered = records.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === selectedYear && (d.getMonth() + 1) === m;
      });
      return { month: m, rev: filtered.reduce((acc, r) => acc + r.revenue, 0), pax: filtered.reduce((acc, r) => acc + r.guests, 0), count: filtered.length };
    });
    const maxRev = Math.max(...result.map(d => d.rev), 1);
    return result.map((d, i) => {
      const prevRev = i > 0 ? result[i-1].rev : 0;
      const growth = prevRev === 0 ? 0 : ((d.rev - prevRev) / prevRev) * 100;
      return { ...d, height: (d.rev / maxRev) * 100, growth, isMax: d.rev === maxRev && d.rev > 0 };
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

  const handleAiAnalyze = async () => {
    if (stats.raw.length === 0) { setAiInsight(T.noRecords); return; }
    setIsAnalyzing(true);
    setAiInsight(null);
    try {
      const insight = await analyzeRecords(stats.raw, lang);
      setAiInsight(insight);
    } catch (err) { setAiInsight(T.aiError); } finally { setIsAnalyzing(false); }
  };

  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], type: TourType.GION_WALK, guide: GUIDES[0], revenue: '', guests: '1', duration: 3 });

  return (
    <div className="w-screen max-w-md mx-auto min-h-screen flex flex-col pb-32 relative overflow-hidden" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-5 pt-10 rounded-b-[2rem] shadow-lg z-20 sticky top-0 bg-slate-900 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-red-700 p-1.5 rounded-lg shadow-md"> <WonderlandLogo className="w-7 h-7" /> </div>
            <div>
              <h1 className="text-lg font-black font-washi leading-tight tracking-tight uppercase">WONDERLAND</h1>
              <p className="text-[7px] font-bold tracking-[0.4em] uppercase text-red-500">Japan Hub</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
             {isAdmin && <button onClick={handleLogout} className="bg-red-950/50 text-red-500 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-900/50">{T.logout}</button>}
             <button onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} className="bg-white/10 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5">{lang === 'ja' ? 'EN' : 'JA'}</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-5 z-10 overflow-y-auto no-scrollbar w-full">
        {showLogin && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-5">
             <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 bg-red-700 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h2 className="text-xl font-black font-washi text-slate-900 uppercase tracking-tighter">System Access</h2>
                <form onSubmit={handleLogin} className="space-y-5">
                   <input autoFocus type="password" inputMode="numeric" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="••••" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-3xl text-center tracking-[0.5em] outline-none focus:border-red-700 shadow-inner" />
                   <div className="flex space-x-3">
                      <button type="button" onClick={() => setShowLogin(false)} className="flex-1 py-4 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[9px]">Cancel</button>
                      <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg">Unlock</button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const newRecord: TourRecord = { id: crypto.randomUUID(), date: formData.date, type: formData.type, guide: formData.guide, revenue: Number(formData.revenue.replace(/,/g, '') || 0), guests: Number(formData.guests), duration: formData.duration, createdAt: Date.now() };
            const updated = [newRecord, ...records];
            setRecords(updated);
            setFormData({ ...formData, revenue: '', guests: '1', duration: 3 });
            alert(T.saveSuccess);
            if (autoSync && cloudUrl) performCloudSync(false, updated);
          }} className="bg-white p-7 rounded-[2.5rem] shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-5">
            <h2 className="text-xl font-black font-washi text-slate-900 border-l-4 border-red-700 pl-4 uppercase tracking-tighter">{T.upload}</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{T.date}</label>
                <div className="relative">
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-5 bg-slate-900 text-white font-bold text-lg rounded-2xl outline-none shadow-md border-2 border-slate-800 appearance-none" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{T.guide}</label>
                   <select value={formData.guide} onChange={e => setFormData({...formData, guide: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-sm focus:border-red-700">
                     {GUIDES.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{T.type}</label>
                   <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TourType})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-[11px] focus:border-red-700">
                     {Object.entries(T.tours).map(([val, label]) => <option key={val} value={val}>{label as string}</option>)}
                   </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{T.revenue}</label>
                  <input type="text" inputMode="numeric" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none shadow-inner" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{T.guests}</label>
                  <select value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none">
                    {Array.from({length: 15}, (_, i) => <option key={i+1} value={i+1}>{i+1} {T.guestUnit}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-red-700 text-white font-black py-6 rounded-[2rem] text-lg font-washi active:scale-[0.96] transition-all shadow-lg uppercase tracking-widest">{T.saveRecordBtn}</button>
            </div>
          </form>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-10 pb-10 w-full">
             <div className="flex flex-wrap gap-2 no-scrollbar overflow-x-auto pb-2">
                {YEARS.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} className={`px-5 py-2.5 rounded-full font-black text-[10px] border transition-all shrink-0 ${selectedYear === y ? 'bg-red-700 text-white border-red-700 shadow-md' : 'bg-white text-slate-300 border-slate-100'}`}>{y}</button>
                ))}
             </div>
             <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="flex justify-between items-end mb-8 h-48 px-2">
                  {monthlyData.map((d) => (
                    <div key={d.month} className="flex flex-col items-center flex-1 h-full justify-end">
                      <div onClick={() => setSelectedMonth(d.month)} className={`w-3/5 rounded-full transition-all duration-700 cursor-pointer ${selectedMonth === d.month ? 'ring-2 ring-red-700/30 scale-105 z-10' : 'opacity-40'} ${d.isMax ? 'bg-gradient-to-t from-red-800 to-red-500' : 'bg-slate-900'}`} style={{ height: `${Math.max(d.height, 8)}%` }} />
                      <span className={`text-[8px] font-black mt-3 ${selectedMonth === d.month ? 'text-red-700' : 'text-slate-300'}`}>{d.month}{T.monthUnit[0]}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSelectedMonth('all')} className="w-full text-[10px] font-black text-slate-900 border-t border-slate-50 pt-4 uppercase tracking-tighter">{T.viewFullYear}</button>
             </div>
             <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-xl">
                <p className="text-amber-400 text-[8px] font-black uppercase tracking-[0.5em] mb-4">{selectedYear} • {selectedMonth === 'all' ? T.annualSummary : `${T.monthlyPerformance} (${selectedMonth}${T.monthUnit})`}</p>
                <div className="flex items-baseline space-x-2 mb-8">
                   <span className="text-lg font-black text-slate-600">¥</span>
                   <h2 className="text-6xl font-black font-washi tracking-tighter truncate">{stats.rev.toLocaleString()}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] text-slate-500 font-black mb-1 uppercase">{T.guests}</p>
                      <p className="text-lg font-black">{stats.pax}</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] text-slate-500 font-black mb-1 uppercase">TOURS</p>
                      <p className="text-lg font-black">{stats.count}</p>
                   </div>
                </div>
             </div>
             <div className="bg-white p-8 rounded-[2.5rem] shadow-xl">
                <h3 className="text-lg font-black font-washi text-slate-900 mb-6 uppercase tracking-tighter">{T.aiInsights}</h3>
                <div className="text-xs leading-[2.2] text-slate-600 font-washi whitespace-pre-wrap min-h-[160px] bg-slate-50 p-6 rounded-2xl border border-slate-100">{aiInsight || T.aiPlaceholder}</div>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing} className="w-full bg-slate-900 text-white font-black py-6 rounded-full text-[10px] uppercase tracking-[0.3em] mt-8 active:scale-95 disabled:opacity-30">{isAnalyzing ? T.aiAnalyzing : T.aiAnalyzeBtn}</button>
             </div>
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-10 pb-10 w-full">
             <h2 className="text-2xl font-black font-washi text-slate-900 uppercase tracking-tighter mb-6 ml-2">{T.archives}</h2>
             {Object.keys(groupedHistory).length === 0 ? (
               <div className="py-40 text-center text-slate-200 font-black tracking-[0.8em] text-[10px] uppercase">Empty</div>
             ) : (
               Object.entries(groupedHistory).map(([monthKey, monthRecords]) => (
                 <div key={monthKey} className="space-y-2">
                    <button 
                      onClick={() => setExpandedMonths(prev => prev.includes(monthKey) ? prev.filter(k => k !== monthKey) : [...prev, monthKey])}
                      className="w-full flex justify-between items-center bg-white/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white font-black text-xs text-slate-600 tracking-widest"
                    >
                       <span>{monthKey.replace('-', ' / ')}</span>
                       <svg className={`w-4 h-4 transition-transform ${expandedMonths.includes(monthKey) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {expandedMonths.includes(monthKey) && (
                      <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                        {monthRecords.map(r => <RecordCardInternal key={r.id} record={r} lang={lang} onDelete={handleDeleteRecord} isAdmin={isAdmin} />)}
                      </div>
                    )}
                 </div>
               ))
             )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in zoom-in duration-500 pb-10 w-full">
             <div className="bg-white p-10 rounded-[2.5rem] shadow-xl space-y-8 flex flex-col min-h-[60vh]">
                <h2 className="text-2xl font-black font-washi text-slate-900 uppercase tracking-tighter border-b-2 border-red-700 w-fit pb-1">{T.system}</h2>
                
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">Cloud API Endpoint</label>
                  <input 
                    type="text" 
                    value={cloudUrl} 
                    onChange={e => setCloudUrl(e.target.value)} 
                    placeholder="https://..." 
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-900 outline-none focus:border-red-700 placeholder-slate-300" 
                  />
                </div>

                <button 
                  onClick={() => performCloudSync()} 
                  disabled={isSyncing} 
                  className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] text-[10px] uppercase tracking-[0.4em] active:scale-95 disabled:opacity-30 shadow-md min-h-[60px] flex items-center justify-center"
                >
                  <span className="text-white opacity-100">{isSyncing ? 'SYNCING...' : T.forceSync}</span>
                </button>
                
                {lastSyncTime && <p className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">{T.lastSync}: {lastSyncTime}</p>}

                {/* 🌟 重新設計的底部簽名區 🌟 */}
                <div className="mt-auto pt-16 text-center">
                   <div className="mb-6">
                      <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] opacity-80">© 2025 WONDERLAND JAPAN</p>
                      <p className="text-[8px] font-bold text-slate-200 uppercase tracking-widest mt-1">All Rights Reserved</p>
                   </div>
                   
                   <div className="opacity-40 hover:opacity-100 transition-opacity duration-700">
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.6em] mb-1">Design & Dev</p>
                      <p className="text-3xl font-signature text-slate-400 select-none">Benjamin Tang</p>
                   </div>
                </div>

                {isAdmin && (
                  <button onClick={handleLogout} className="w-full py-4 mt-4 text-red-300 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-red-50 rounded-full transition-all">Sign Out</button>
                )}
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-20 glass flex justify-around items-center rounded-full shadow-2xl z-50 border border-white/60 px-4">
        <button onClick={() => handleTabSwitch('upload')} className={`p-4 rounded-full transition-all duration-300 ${activeTab === 'upload' ? 'bg-red-700 text-white -translate-y-4 scale-110 shadow-lg' : 'text-slate-300'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('dashboard')} className={`p-4 rounded-full transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-slate-900 text-amber-400 -translate-y-4 scale-110 shadow-lg' : 'text-slate-300'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('history')} className={`p-4 rounded-full transition-all duration-300 ${activeTab === 'history' ? 'bg-slate-900 text-amber-400 -translate-y-4 scale-110 shadow-lg' : 'text-slate-300'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('settings')} className={`p-4 rounded-full transition-all duration-300 ${activeTab === 'settings' ? 'bg-slate-900 text-amber-400 -translate-y-4 scale-110 shadow-lg' : 'text-slate-300'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" /></svg>
        </button>
      </nav>
    </div>
  );
};

export default App;
