
import React, { useState, useEffect, useMemo } from 'react';
import { TourType, TourRecord, Language } from './types';
import { TOUR_COLORS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES, TOUR_ICONS } from './constants';
import { analyzeRecords } from './services/geminiService';

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
    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-6 mb-5 flex items-center justify-between transition-all active:scale-[0.97] group">
      <div className="flex items-center space-x-5 flex-1 min-w-0">
        <div className="p-4 rounded-2xl text-white shadow-lg flex-shrink-0 transition-transform group-hover:rotate-6" style={{ backgroundColor: TOUR_COLORS[record.type] }}>
          {TOUR_ICONS[record.type]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-slate-900 text-base tracking-tight font-washi truncate">
            {T.tours?.[record.type] || record.type}
          </h4>
          <div className="flex items-center space-x-3 mt-1">
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{formatDate(record.date, lang)}</p>
             <span className="text-[9px] bg-amber-50 text-amber-900 px-3 py-1 rounded-full font-black border border-amber-200">
               {record.guide}
             </span>
          </div>
          <div className="flex gap-2.5 mt-3">
            {isAdmin && (
              <span className="text-[10px] bg-white px-3.5 py-1.5 rounded-xl text-slate-800 font-black border border-slate-100 shadow-sm">
                ¥{record.revenue.toLocaleString()}
              </span>
            )}
            <span className="text-[10px] bg-white px-3.5 py-1.5 rounded-xl text-slate-800 font-black border border-slate-100 shadow-sm">
              {record.guests} {T.guestUnit}
            </span>
          </div>
        </div>
      </div>
      {isAdmin && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="p-4 text-slate-200 hover:text-red-500 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </div>
  );
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

  // 核心邏輯：過濾掉空數據（revenue 和 guests 都是 0 的紀錄）以及無效日期
  const filterInvalidRecords = (raw: any[]): TourRecord[] => {
    return raw.filter(r => {
      const hasContent = Number(r.revenue) > 0 || Number(r.guests) > 0;
      const hasDate = r.date && !isNaN(new Date(r.date).getTime());
      return hasContent && hasDate;
    });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const savedRecords = localStorage.getItem('tour_records');
        if (savedRecords) {
          const parsed = JSON.parse(savedRecords);
          if (Array.isArray(parsed)) setRecords(filterInvalidRecords(parsed));
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

  // 嚴格按月份分組邏輯，確保不會出現 NaN 或 undefined
  const groupedHistoryByMonth = useMemo(() => {
    const groups: Record<string, TourRecord[]> = {};
    const validRecords = filterInvalidRecords(records);
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
        // 同樣過濾雲端傳回的空行
        const cleanData = filterInvalidRecords(cloudData);
        const sorted = cleanData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], type: TourType.GION_WALK, guide: GUIDES[0], revenue: '', guests: '1', duration: 3 });

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden select-none" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-6 pt-12 rounded-b-[2.5rem] shadow-2xl z-20 bg-slate-900 text-white shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-red-700 p-2 rounded-xl shadow-lg"> <WonderlandLogo className="w-8 h-8" /> </div>
            <div>
              <h1 className="text-xl font-black font-washi leading-tight tracking-tight uppercase">WONDERLAND</h1>
              <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-red-500">Japan Hub</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
             {isAdmin && <button onClick={handleLogout} className="bg-red-950/50 text-red-500 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-900/50 mr-2">{T.logout}</button>}
             <button onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">{lang === 'ja' ? 'EN' : 'JA'}</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden no-scrollbar relative z-10 w-full max-w-md mx-auto pb-44">
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
          <form onSubmit={async (e) => {
            e.preventDefault();
            const newRecord: TourRecord = { id: crypto.randomUUID(), date: formData.date, type: formData.type, guide: formData.guide, revenue: Number(formData.revenue.replace(/,/g, '') || 0), guests: Number(formData.guests), duration: formData.duration, createdAt: Date.now() };
            const updated = [newRecord, ...records];
            setRecords(updated);
            setFormData({ ...formData, revenue: '', guests: '1', duration: 3 });
            alert(T.saveSuccess);
            if (autoSync && cloudUrl) performCloudSync(false, updated);
          }} className="bg-white p-8 rounded-[3.5rem] shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-10 w-full overflow-hidden">
            <h2 className="text-2xl font-black font-washi text-slate-900 border-l-8 border-red-700 pl-6 uppercase tracking-tighter">{T.upload}</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.date}</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-6 bg-slate-900 text-white font-black font-washi text-xl rounded-[2rem] outline-none shadow-xl border-4 border-slate-800" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.guide}</label>
                   <select value={formData.guide} onChange={e => setFormData({...formData, guide: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-xl outline-none shadow-inner focus:border-red-700 appearance-none">
                     {GUIDES.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.type}</label>
                   <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TourType})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold outline-none shadow-inner focus:border-red-700 text-[11px] appearance-none leading-tight">
                     {Object.entries(T.tours).map(([val, label]) => <option key={val} value={val}>{label as string}</option>)}
                   </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.revenue}</label>
                  <input type="text" inputMode="numeric" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-2xl outline-none shadow-inner" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.guests}</label>
                  <select value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-2xl outline-none shadow-inner appearance-none">
                    {Array.from({length: 15}, (_, i) => <option key={i+1} value={i+1}>{i+1} {T.guestUnit}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-red-700 h-24 rounded-[3rem] shadow-2xl active:scale-[0.96] transition-all flex items-center justify-center overflow-hidden border-b-8 border-red-900 border-r-2 border-l-2 border-red-800">
                <span className="text-white font-black text-2xl font-washi uppercase tracking-[0.2em]">{T.saveRecordBtn}</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-10 pb-10 w-full overflow-hidden">
             <div className="flex flex-wrap gap-2">
                {YEARS.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} className={`px-6 py-3 rounded-full font-black text-xs border-2 transition-all ${selectedYear === y ? 'bg-red-700 text-white border-red-700 shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>{y}</button>
                ))}
             </div>
             
             <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden relative">
                <div className="flex justify-between items-end mb-4 h-80 px-2 relative z-10">
                  {monthlyData.map((d) => (
                    <div key={d.month} className="flex flex-col items-center flex-1 h-full justify-end relative group">
                      {/* 柱狀圖數值直接顯示在柱體上方 (對比需求) */}
                      {d.rev > 0 && (
                        <div className="absolute bottom-[calc(height+5px)] mb-1 flex flex-col items-center z-20 pointer-events-none">
                           <span className="text-[9px] font-black text-slate-900 bg-white/80 px-1 rounded shadow-sm border border-slate-50">¥{(d.rev/1000).toFixed(0)}k</span>
                        </div>
                      )}
                      
                      {/* 進步/退步標示 (柱體中間或下方顯示趨勢) */}
                      {d.rev > 0 && d.month > 1 && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-20 pointer-events-none -mt-4">
                          {d.diff > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-green-500">▲</span>
                              <span className="text-[7px] font-black text-green-600 bg-green-50 px-0.5 rounded">+{d.growth.toFixed(0)}%</span>
                            </div>
                          ) : d.diff < 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-red-500">▼</span>
                              <span className="text-[7px] font-black text-red-600 bg-red-50 px-0.5 rounded">{d.growth.toFixed(0)}%</span>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div onClick={() => setSelectedMonth(d.month)} className={`w-4/5 rounded-t-full rounded-b-lg transition-all duration-700 cursor-pointer ${selectedMonth === d.month ? 'ring-4 ring-red-700/30 shadow-2xl scale-110 z-10' : 'opacity-40'} ${d.isMax ? 'bg-gradient-to-t from-red-800 to-red-500' : 'bg-slate-900'}`} style={{ height: `${Math.max(d.height, 4)}%` }}>
                      </div>
                      <span className={`text-[9px] font-black mt-4 ${selectedMonth === d.month ? 'text-red-700' : 'text-slate-300'}`}>{T.months[d.month]}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSelectedMonth('all')} className="w-full text-[11px] font-black text-slate-900 border-t border-slate-50 pt-6 uppercase tracking-widest">{T.viewFullYear}</button>
             </div>

             <div className="bg-slate-900 text-white p-12 rounded-[4.5rem] shadow-2xl">
                <p className="text-amber-400 text-[11px] font-black uppercase tracking-[0.5em] mb-6">
                  {selectedYear} • {selectedMonth === 'all' ? T.annualSummary : `${T.monthlyPerformance} (${T.months[selectedMonth]})`}
                </p>
                <div className="flex items-baseline space-x-3 mb-10">
                   <span className="text-xl font-black text-slate-600">¥</span>
                   <h2 className="text-7xl font-black font-washi tracking-tighter truncate">{stats.rev.toLocaleString()}</h2>
                </div>
                <div className="grid grid-cols-2 gap-5">
                   <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                      <p className="text-[10px] text-slate-500 font-black mb-1 uppercase">{T.guests}</p>
                      <p className="text-2xl font-black">{stats.pax}</p>
                   </div>
                   <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                      <p className="text-[10px] text-slate-500 font-black mb-1 uppercase">TOURS</p>
                      <p className="text-2xl font-black">{stats.count}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl relative">
                <h3 className="text-2xl font-black font-washi text-slate-900 mb-8 uppercase tracking-tighter">{T.aiInsights}</h3>
                <div className="text-[13px] leading-[2.4] text-slate-600 font-washi whitespace-pre-wrap min-h-[200px] bg-slate-50 p-8 rounded-3xl border border-slate-100">{aiInsight || T.aiPlaceholder}</div>
                <button onClick={() => { setIsAnalyzing(true); setAiInsight(null); analyzeRecords(stats.raw, lang).then(setAiInsight).finally(() => setIsAnalyzing(false)); }} disabled={isAnalyzing} className="w-full h-24 bg-slate-900 text-white font-black rounded-full text-xs uppercase tracking-[0.3em] mt-10 active:scale-95 disabled:opacity-30 flex items-center justify-center border-b-8 border-slate-950">
                  {isAnalyzing ? T.aiAnalyzing : T.aiAnalyzeBtn}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-10 pb-10 w-full overflow-hidden">
             <h2 className="text-3xl font-black font-washi text-slate-900 uppercase tracking-tighter mb-10 ml-2">{T.archives}</h2>
             {Object.keys(groupedHistoryByMonth).length === 0 ? (
               <div className="py-44 text-center text-slate-200 font-black tracking-[0.8em] text-xs uppercase">Empty</div>
             ) : (
               Object.entries(groupedHistoryByMonth).map(([monthKey, monthRecords]) => {
                 // 這裡需要多加防護，確保 monthKey 正確
                 if (monthKey.includes('NaN') || monthKey.includes('undefined')) return null;
                 const [y, m] = monthKey.split('-');
                 const monthIdx = parseInt(m);
                 const displayMonth = lang === 'ja' ? `${y}年 ${monthIdx}月` : `${T.months[monthIdx]} ${y}`;
                 return (
                   <div key={monthKey} className="space-y-4">
                      <button 
                        onClick={() => setExpandedMonths(prev => prev.includes(monthKey) ? prev.filter(k => k !== monthKey) : [...prev, monthKey])}
                        className="w-full flex justify-between items-center bg-white px-8 py-7 rounded-[2.5rem] border-2 border-slate-100 font-black text-lg text-slate-800 tracking-widest shadow-lg active:scale-95 transition-all"
                      >
                         <span className="font-washi">{displayMonth}</span>
                         <svg className={`w-7 h-7 transition-transform duration-500 ${expandedMonths.includes(monthKey) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {expandedMonths.includes(monthKey) && (
                        <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-6 duration-500">
                          {monthRecords.map(r => <RecordCardInternal key={r.id} record={r} lang={lang} onDelete={handleDeleteRecord} isAdmin={isAdmin} />)}
                        </div>
                      )}
                   </div>
                 );
               })
             )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in zoom-in duration-500 pb-10 w-full overflow-hidden">
             <div className="bg-white p-12 rounded-[4.5rem] shadow-2xl space-y-12 flex flex-col min-h-[75vh] relative">
                <h2 className="text-3xl font-black font-washi text-slate-900 uppercase tracking-tighter border-b-4 border-red-700 w-fit pb-2">{T.system}</h2>
                
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-2">{T.cloudEndpoint}</label>
                  <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="https://script.google.com/..." className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-xs font-bold outline-none focus:border-red-700 shadow-inner" />
                </div>

                <button onClick={() => performCloudSync()} disabled={isSyncing} className="w-full bg-slate-900 h-28 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center border-b-8 border-slate-950 border-r-2 border-l-2 border-slate-800">
                  <span className="text-white font-black text-xl uppercase tracking-[0.4em]">{isSyncing ? 'SYNCING...' : T.forceSync}</span>
                </button>
                
                {lastSyncTime && <p className="text-center text-[11px] font-black text-slate-300 uppercase tracking-widest">{T.lastSync}: {lastSyncTime}</p>}
                
                <div className="mt-auto pt-24 text-center flex flex-col items-center">
                   <div className="mb-12">
                      <p className="text-[20px] font-black text-slate-900 uppercase tracking-[0.5em] mb-2 font-washi leading-none">WONDERLAND JAPAN</p>
                      <div className="h-1.5 w-28 bg-red-700 mx-auto rounded-full mb-4" />
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">© All Rights Reserved 2025</p>
                   </div>
                   
                   <div className="opacity-40 transition-opacity hover:opacity-100 duration-1000">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[1em] mb-2 ml-3">DESIGNED BY</p>
                      <p className="text-4xl font-signature text-slate-500 select-none transform -rotate-3">Benjamin Tang</p>
                   </div>
                </div>

                {isAdmin && (
                  <button onClick={handleLogout} className="w-full py-8 mt-10 text-red-400 text-xs font-black uppercase tracking-[0.4em] hover:bg-red-50 rounded-full transition-all">Sign Out</button>
                )}
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-8 right-8 h-24 glass flex justify-around items-center rounded-full shadow-[0_40px_80px_rgba(0,0,0,0.4)] z-50 border border-white/70 px-8">
        <button onClick={() => handleTabSwitch('upload')} className={`p-6 rounded-full transition-all duration-500 ${activeTab === 'upload' ? 'bg-red-700 text-white -translate-y-8 scale-150 shadow-2xl' : 'text-slate-300'}`}>
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('dashboard')} className={`p-6 rounded-full transition-all duration-500 ${activeTab === 'dashboard' ? 'bg-slate-900 text-amber-400 -translate-y-8 scale-150 shadow-2xl' : 'text-slate-300'}`}>
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('history')} className={`p-6 rounded-full transition-all duration-500 ${activeTab === 'history' ? 'bg-slate-900 text-amber-400 -translate-y-8 scale-150 shadow-2xl' : 'text-slate-300'}`}>
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('settings')} className={`p-6 rounded-full transition-all duration-500 ${activeTab === 'settings' ? 'bg-slate-900 text-amber-400 -translate-y-8 scale-150 shadow-2xl' : 'text-slate-300'}`}>
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" /></svg>
        </button>
      </nav>
    </div>
  );
};

export default App;
