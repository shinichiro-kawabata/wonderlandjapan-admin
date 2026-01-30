
import React, { useState, useEffect, useMemo } from 'react';
import { TourType, TourRecord, Language } from './types';
import { TOUR_COLORS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES } from './constants';
import RecordCard from './RecordCard';
import { analyzeRecords } from './services/geminiService';

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
  
  // 核心變更：移除 2024，從 2025 開始
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  
  const [cloudUrl, setCloudUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  const T = TRANSLATIONS[lang] || TRANSLATIONS.ja;
  const YEARS = [2025, 2026, 2027, 2028, 2029, 2030]; // 徹底移除 2024
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    const init = async () => {
      try {
        const savedRecords = localStorage.getItem('tour_records');
        if (savedRecords) {
          const parsed = JSON.parse(savedRecords);
          if (Array.isArray(parsed) && parsed.length > 0) setRecords(parsed);
        }
        const savedUrl = localStorage.getItem('cloud_sync_url');
        if (savedUrl) setCloudUrl(savedUrl);
        const savedAuto = localStorage.getItem('auto_sync');
        if (savedAuto) setAutoSync(savedAuto === 'true');
        const savedAdmin = localStorage.getItem('is_admin');
        if (savedAdmin === 'true') setIsAdmin(true);
        setIsInitialLoadDone(true);
        if (savedUrl) setTimeout(() => performCloudSync(false), 500);
      } catch (e) {
        setIsInitialLoadDone(true);
      }
    };
    init();
  }, []);

  useEffect(() => { 
    if (isInitialLoadDone) localStorage.setItem('tour_records', JSON.stringify(records)); 
  }, [records, isInitialLoadDone]);

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
        setRecords(cloudData.sort((a,b) => b.date.localeCompare(a.date)));
        setLastSyncTime(new Date().toLocaleString('ja-JP'));
        if (showAlert) alert(T.syncSuccess);
      }
    } catch (err) { if (showAlert) alert(T.syncError); } finally { setIsSyncing(false); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPasswordInput('');
      if (targetTabAfterLogin) { setActiveTab(targetTabAfterLogin); setTargetTabAfterLogin(null); }
    } else { alert(lang === 'ja' ? 'パスワードが違います' : 'Incorrect PIN'); }
  };

  const handleTabSwitch = (tab: typeof activeTab) => {
    if (!isAdmin && tab !== 'upload') { setTargetTabAfterLogin(tab); setShowLogin(true); } else { setActiveTab(tab); }
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
      return {
        month: m,
        rev: filtered.reduce((acc, r) => acc + r.revenue, 0),
        pax: filtered.reduce((acc, r) => acc + r.guests, 0),
        count: filtered.length
      };
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
    return {
      rev: filtered.reduce((acc, r) => acc + r.revenue, 0),
      pax: filtered.reduce((acc, r) => acc + r.guests, 0),
      count: filtered.length,
      raw: filtered
    };
  }, [records, selectedYear, selectedMonth]);

  const handleAiAnalyze = async () => {
    if (stats.raw.length === 0) { setAiInsight(T.noRecords); return; }
    setIsAnalyzing(true);
    setAiInsight(null);
    try {
      const ctx = selectedMonth === 'all' ? `${selectedYear}${T.yearly}` : `${selectedYear}${T.date}${selectedMonth}${T.monthUnit}`;
      const insight = await analyzeRecords(stats.raw, lang);
      setAiInsight(`【${ctx}】\n\n${insight}`);
    } catch (err) { setAiInsight(T.aiError); } finally { setIsAnalyzing(false); }
  };

  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], type: TourType.GION_WALK, guide: GUIDES[0], revenue: '', guests: '1', duration: 3 });

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-32 relative" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-6 pt-12 rounded-b-[2.5rem] shadow-2xl z-20 sticky top-0 bg-slate-900 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-red-700 p-2 rounded-xl"> <WonderlandLogo className="w-8 h-8" /> </div>
            <div>
              <h1 className="text-xl font-black font-washi leading-tight tracking-tight">WONDERLAND</h1>
              <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-red-500">System Admin</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
             <button onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">{lang === 'ja' ? 'EN' : 'JA'}</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 z-10 overflow-y-auto no-scrollbar">
        {showLogin && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
             <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center space-y-8 animate-in zoom-in duration-300">
                <h2 className="text-2xl font-black font-washi text-slate-900">Unlock System</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                   <input autoFocus type="password" inputMode="numeric" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="••••" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-4xl text-center tracking-[0.5em] outline-none focus:border-red-700 transition-all" />
                   <div className="flex space-x-3">
                      <button type="button" onClick={() => setShowLogin(false)} className="flex-1 py-5 rounded-[2rem] font-black text-slate-400 uppercase tracking-widest text-xs">Cancel</button>
                      <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs">Unlock</button>
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
          }} className="bg-white p-8 rounded-[3rem] shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-6">
            <h2 className="text-2xl font-black font-washi text-slate-900">{T.upload}</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.date}</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-6 bg-slate-900 text-white font-black font-washi text-xl rounded-[2rem] outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.guide}</label>
                   <select value={formData.guide} onChange={e => setFormData({...formData, guide: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold outline-none">
                     {GUIDES.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.type}</label>
                   <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TourType})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold outline-none">
                     {Object.entries(T.tours).map(([val, label]) => <option key={val} value={val}>{label as string}</option>)}
                   </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.revenue}</label>
                  <input type="text" inputMode="numeric" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-xl outline-none" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.guests}</label>
                  <select value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-xl outline-none">
                    {Array.from({length: 15}, (_, i) => <option key={i+1} value={i+1}>{i+1} {T.guestUnit}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-red-700 text-white font-black py-6 rounded-[2.5rem] text-xl font-washi active:scale-[0.96] transition-all shadow-2xl uppercase tracking-widest">{T.saveRecordBtn}</button>
            </div>
          </form>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 pb-10">
             <div className="flex flex-wrap gap-2">
                {YEARS.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} className={`px-5 py-2 rounded-2xl font-black text-xs border-2 transition-all ${selectedYear === y ? 'bg-red-700 text-white border-red-700 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 opacity-60'}`}>
                    {y}
                  </button>
                ))}
             </div>

             <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="flex justify-between items-end mb-10 h-64 px-2">
                  {monthlyData.map((d) => {
                    const isBeforeStart = selectedYear === 2025 && d.month < 9;
                    return (
                      <div key={d.month} className="flex flex-col items-center flex-1 group relative">
                        {!isBeforeStart && d.month > 1 && d.rev > 0 && (
                          <div className={`absolute -top-10 px-2 py-1 rounded-full text-[8px] font-black transition-all ${d.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {d.growth >= 0 ? '+' : ''}{Math.round(d.growth)}%
                          </div>
                        )}
                        <div 
                          onClick={() => setSelectedMonth(d.month)}
                          className={`w-4/5 rounded-full transition-all duration-700 relative cursor-pointer ${selectedMonth === d.month ? 'ring-4 ring-red-700/20 shadow-2xl scale-110' : 'opacity-80 hover:opacity-100'} ${isBeforeStart ? 'bg-slate-100 border-2 border-dashed border-slate-200' : d.isMax ? 'bg-gradient-to-t from-red-800 to-red-600 shadow-lg' : 'bg-slate-900'}`}
                          style={{ height: `${Math.max(d.height, 5)}%` }}
                        >
                          {d.isMax && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 animate-bounce">👑</div>}
                        </div>
                        <span className={`text-[8px] font-black mt-4 ${selectedMonth === d.month ? 'text-red-700' : 'text-slate-300'}`}>{d.month}{T.monthUnit[0]}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                   <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-700 rounded-full" />
                      <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">{T.highestRev}</span>
                   </div>
                   <button onClick={() => setSelectedMonth('all')} className="text-[10px] font-black text-slate-800 underline decoration-red-700 underline-offset-4 uppercase">{T.viewFullYear}</button>
                </div>
             </div>

             <div className="bg-slate-900 text-white p-10 rounded-[4rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-700/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-red-700/20 transition-all duration-1000" />
                <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4">
                  {selectedYear} • {selectedMonth === 'all' ? T.annualSummary : `${T.monthlyPerformance} (${selectedMonth}${T.monthUnit})`}
                </p>
                <div className="flex items-baseline space-x-2 mb-10">
                   <span className="text-sm font-black text-slate-500">¥</span>
                   <h2 className="text-6xl font-black font-washi tracking-tighter">{stats.rev.toLocaleString()}</h2>
                </div>
                <div className="grid grid-cols-3 gap-6">
                   <div className="text-center p-4 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                      <p className="text-[8px] text-slate-500 font-black mb-1 uppercase tracking-widest">{T.growth}</p>
                      <p className="text-lg font-black">{selectedMonth === 'all' ? '---' : `${Math.round(monthlyData[Number(selectedMonth)-1]?.growth || 0)}%`}</p>
                   </div>
                   <div className="text-center p-4 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                      <p className="text-[8px] text-slate-500 font-black mb-1 uppercase tracking-widest">{T.guests}</p>
                      <p className="text-lg font-black">{stats.pax}</p>
                   </div>
                   <div className="text-center p-4 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                      <p className="text-[8px] text-slate-500 font-black mb-1 uppercase tracking-widest">TOURS</p>
                      <p className="text-lg font-black">{stats.count}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-100">
                <div className="flex items-center space-x-4 mb-8">
                   <div className="w-12 h-12 bg-red-700 rounded-full flex items-center justify-center text-white">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
                   </div>
                   <h3 className="text-xl font-black font-washi text-slate-900 tracking-tight">{T.aiInsights}</h3>
                </div>
                <div className="text-xs leading-[2.2] text-slate-600 font-washi whitespace-pre-wrap min-h-[180px] bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                  {aiInsight || (selectedYear === 2025 && selectedMonth !== 'all' && selectedMonth < 9 
                    ? T.preLaunchDesc
                    : T.aiPlaceholder)}
                </div>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing || (selectedYear === 2025 && selectedMonth !== 'all' && selectedMonth < 9)} className="w-full bg-slate-900 text-white font-black py-6 rounded-full text-[10px] uppercase tracking-widest mt-10 active:scale-95 disabled:opacity-20 shadow-2xl transition-all">
                  {isAnalyzing ? T.aiAnalyzing : T.aiAnalyzeBtn}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-8">
             <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-2xl font-black font-washi text-slate-900">{T.archives}</h2>
                <button onClick={() => {
                   const headers = ['Date', 'Type', 'Guide', 'Revenue', 'Guests'];
                   const csv = "data:text/csv;charset=utf-8," + [headers, ...records.map(r => [r.date, r.type, r.guide, r.revenue, r.guests])].map(e => e.join(",")).join("\n");
                   const link = document.createElement("a");
                   link.setAttribute("href", encodeURI(csv));
                   link.setAttribute("download", `wonderland_full_report.csv`);
                   link.click();
                }} className="text-[10px] font-black text-slate-400 border-2 border-slate-100 px-5 py-2.5 rounded-full uppercase tracking-widest transition-all hover:bg-slate-900 hover:text-white">{T.exportCSV}</button>
             </div>
             {records.length === 0 ? (
               <div className="py-32 text-center text-slate-200 font-black uppercase tracking-[0.5em] text-xs">{T.noRecords}</div>
             ) : (
               records.map(r => <RecordCard key={r.id} record={r} lang={lang} onDelete={handleDeleteRecord} isAdmin={isAdmin} />)
             )}
          </div>
        )}

        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-8 animate-in fade-in zoom-in">
             <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl space-y-8">
                <h2 className="text-2xl font-black font-washi text-slate-900">{T.system}</h2>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.cloudEndpoint}</label>
                   <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="https://script.google.com/..." className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-bold outline-none focus:border-red-700 transition-all shadow-inner" />
                </div>
                <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                   <div>
                      <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest">{T.instantUpload}</h4>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest">{T.autoSyncDesc}</p>
                   </div>
                   <button onClick={() => setAutoSync(!autoSync)} className={`w-16 h-10 rounded-full transition-all flex items-center px-1.5 ${autoSync ? 'bg-red-700' : 'bg-slate-200'}`}>
                      <div className={`w-7 h-7 bg-white rounded-full shadow-lg transform transition-transform ${autoSync ? 'translate-x-6' : 'translate-x-0'}`} />
                   </button>
                </div>
                <button onClick={() => performCloudSync()} disabled={isSyncing} className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] text-xs uppercase tracking-widest active:scale-95 disabled:opacity-30 shadow-xl transition-all">
                   {isSyncing ? 'UPDATING...' : T.forceSync}
                </button>
                {lastSyncTime && <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">{T.lastSync}: {lastSyncTime}</p>}
                <button onClick={() => setIsAdmin(false)} className="w-full py-4 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 rounded-full transition-all">{T.endSession}</button>
                
                {/* 簽名與所有權標記 */}
                <div className="mt-12 pt-8 border-t border-slate-50 text-center animate-in fade-in duration-1000">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Designed by</p>
                   <p className="text-4xl font-signature text-slate-900 mb-6 px-4">Benjamin Tang</p>
                   <div className="flex items-center justify-center space-x-2 text-[8px] font-bold text-red-700/40 uppercase tracking-[0.4em]">
                      <span className="text-xs">©</span>
                      <span>WonderlandJapan All Rights Reserved</span>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-20 glass flex justify-around items-center rounded-full shadow-2xl z-50 border border-white/60 px-4">
        <button onClick={() => handleTabSwitch('upload')} className={`p-4 rounded-full transition-all ${activeTab === 'upload' ? 'bg-red-700 text-white -translate-y-4 scale-125 shadow-xl' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('dashboard')} className={`p-4 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-amber-400 -translate-y-4 scale-125 shadow-xl' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('history')} className={`p-4 rounded-full transition-all ${activeTab === 'history' ? 'bg-slate-900 text-amber-400 -translate-y-4 scale-125 shadow-xl' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('settings')} className={`p-4 rounded-full transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-amber-400 -translate-y-4 scale-125 shadow-xl' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" /></svg>
        </button>
      </nav>
    </div>
  );
};

export default App;
