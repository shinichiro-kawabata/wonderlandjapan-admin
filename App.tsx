
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TourType, TourRecord, Language } from './types';
import { TOUR_COLORS, TOUR_ICONS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES } from './constants';
import RecordCard from './components/RecordCard';
import { analyzeRecords } from './services/geminiService';

const DELETE_PASSWORD = '0124';

const GrowthChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  if (data.length === 0) return (
    <div className="w-full h-[180px] flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-[10px]">
      No Data Available
    </div>
  );

  const max = Math.max(...data.map(d => d.value), 1);
  const width = 400;
  const height = 180;
  const paddingX = 40;
  const paddingY = 40;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (width - paddingX * 2) + paddingX;
    const y = height - (d.value / max) * (height - paddingY * 2) - paddingY;
    return { x, y, value: d.value, label: d.label };
  });

  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - 20} L ${points[0].x} ${height - 20} Z`;

  return (
    <div className="w-full mt-4 overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 relative shadow-inner">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#AF2020" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#AF2020" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* 背景參考線 */}
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
        <line x1={paddingX} y1={height/2} x2={width - paddingX} y2={height/2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#f1f5f9" strokeWidth="2" />

        {/* 漸層區域 */}
        <path d={areaPath} fill="url(#areaGradient)" />
        
        {/* 主曲線 */}
        <path d={path} fill="none" stroke="#AF2020" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* 數據點與數值標註 */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#AF2020" strokeWidth="3" className="drop-shadow-sm" />
            
            {/* 數值文字 (¥) */}
            <text 
              x={p.x} 
              y={p.y - 12} 
              textAnchor="middle" 
              className="fill-slate-900 font-black text-[10px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              ¥{(p.value / 1000).toFixed(0)}k
            </text>
            
            {/* 月份標籤 */}
            <text 
              x={p.x} 
              y={height - 10} 
              textAnchor="middle" 
              className="fill-slate-400 font-black text-[9px] uppercase tracking-tighter"
            >
              {p.label}M
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const WashiSelect = ({ label, value, options, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1 block font-washi">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:border-red-500 outline-none transition-all font-bold text-slate-900 shadow-sm flex items-center justify-between active:scale-[0.98]"
      >
        <span className="truncate font-washi">{options[value] || value}</span>
        <svg className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {Object.entries(options).map(([val, label]) => (
              <button key={val} type="button" className={`w-full text-left px-6 py-3 text-sm font-bold font-washi transition-colors hover:bg-red-50 ${value === val ? 'text-red-700 bg-red-50' : 'text-slate-700'}`} onClick={() => { onChange(val); setIsOpen(false); }}>
                {label as string}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ja');
  const [records, setRecords] = useState<TourRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'history' | 'admin'>('upload');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [cloudUrl, setCloudUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  
  const initialized = useRef(false);
  const T = TRANSLATIONS[lang];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tour_records');
      if (saved) setRecords(JSON.parse(saved));
      const savedUrl = localStorage.getItem('cloud_sync_url');
      if (savedUrl) setCloudUrl(savedUrl);
      const savedAuto = localStorage.getItem('auto_sync');
      if (savedAuto) setAutoSync(savedAuto === 'true');
      const savedLast = localStorage.getItem('last_sync_time');
      if (savedLast) setLastSyncTime(savedLast);
      
      if (savedUrl && !initialized.current) {
        initialized.current = true;
        setTimeout(() => performCloudSync(false), 1000); 
      }
    } catch (e) {
      console.error("Storage load failed", e);
    }
  }, []);

  useEffect(() => { 
    localStorage.setItem('tour_records', JSON.stringify(records)); 
    localStorage.setItem('cloud_sync_url', cloudUrl);
    localStorage.setItem('auto_sync', String(autoSync));
    if (lastSyncTime) localStorage.setItem('last_sync_time', lastSyncTime);
  }, [records, cloudUrl, autoSync, lastSyncTime]);

  const mergeRecords = (incoming: TourRecord[]) => {
    setRecords(prev => {
      const map = new Map();
      [...prev, ...incoming].forEach(r => map.set(r.id, r));
      return Array.from(map.values()).sort((a,b) => b.date.localeCompare(a.date));
    });
  };

  const performCloudSync = async (showAlert = true) => {
    if (!cloudUrl || !cloudUrl.startsWith('https://script.google.com')) {
      if (showAlert) alert(T.syncError);
      return;
    }
    setIsSyncing(true);
    try {
      await fetch(cloudUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', data: records })
      });

      const getResponse = await fetch(`${cloudUrl}?action=get`);
      const cloudData = await getResponse.json();
      if (Array.isArray(cloudData)) {
        mergeRecords(cloudData);
        const now = new Date().toLocaleString('ja-JP');
        setLastSyncTime(now);
        if (showAlert) alert(T.syncSuccess);
      }
    } catch (err) {
      console.error("Sync Error:", err);
      if (showAlert) alert(T.syncError);
    } finally {
      setIsSyncing(false);
    }
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: TourType.GION_WALK,
    guide: GUIDES[0],
    revenue: '',
    guests: '1',
    duration: 3
  });

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.revenue && formData.type !== TourType.FREE_TOUR) {
      alert(T.revenueError);
      return;
    }
    const newRecord: TourRecord = { id: crypto.randomUUID(), date: formData.date, type: formData.type, guide: formData.guide, revenue: Number(formData.revenue.replace(/,/g, '') || 0), guests: Number(formData.guests), duration: formData.duration, createdAt: Date.now() };
    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    setFormData({ ...formData, revenue: '', guests: '1', duration: 3 });
    alert(T.saveSuccess);
    
    if (autoSync && cloudUrl) {
      performCloudSync(false);
    }
  };

  const nestedStats = useMemo(() => {
    const groups: any = {};
    records.forEach(r => {
      const date = new Date(r.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const quarter = Math.floor((month - 1) / 3) + 1;

      if (!groups[year]) groups[year] = { rev: 0, pax: 0, quarters: {} };
      if (!groups[year].quarters[quarter]) groups[year].quarters[quarter] = { rev: 0, pax: 0, months: {} };
      if (!groups[year].quarters[quarter].months[month]) groups[year].quarters[quarter].months[month] = { rev: 0, pax: 0 };

      groups[year].rev += r.revenue;
      groups[year].pax += r.guests;
      groups[year].quarters[quarter].rev += r.revenue;
      groups[year].quarters[quarter].pax += r.guests;
      groups[year].quarters[quarter].months[month].rev += r.revenue;
      groups[year].quarters[quarter].months[month].pax += r.guests;
    });
    return groups;
  }, [records]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, { totalRev: number, totalPax: number, items: TourRecord[] }> = {};
    records.forEach(r => {
      const monthKey = r.date.substring(0, 7); // YYYY-MM
      if (!groups[monthKey]) groups[monthKey] = { totalRev: 0, totalPax: 0, items: [] };
      groups[monthKey].totalRev += r.revenue;
      groups[monthKey].totalPax += r.guests;
      groups[monthKey].items.push(r);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  const chartData = useMemo(() => {
    const raw: { [key: string]: number } = {};
    records.forEach(r => {
      const monthKey = r.date.substring(0, 7); 
      raw[monthKey] = (raw[monthKey] || 0) + r.revenue;
    });
    return Object.entries(raw)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label: label.split('-')[1], value }))
      .slice(-6); 
  }, [records]);

  const handleSafeDelete = (id: string) => {
    const pwd = prompt(T.deletePasswordPrompt);
    if (pwd === DELETE_PASSWORD) {
      setRecords(prev => prev.filter(x => x.id !== id));
    } else if (pwd !== null) {
      alert(T.deletePasswordError);
    }
  };

  const handleDownloadCSV = () => {
    if (records.length === 0) {
      alert(T.noRecords);
      return;
    }
    const headers = ['Date', 'Type', 'Guide', 'Revenue', 'Guests', 'Duration'];
    const rows = records.map(r => [r.date, T.tours[r.type], r.guide, r.revenue, r.guests, r.duration]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeRecords(records, lang);
      setAiInsight(result || T.aiError);
    } catch (err) {
      setAiInsight(T.aiError);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-32 relative overflow-hidden" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-6 pt-12 rounded-b-[2.5rem] shadow-2xl z-20 sticky top-0 bg-slate-900 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-red-700 p-2 rounded-xl shadow-lg shadow-red-900/40">
               <WonderlandLogo className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black font-washi leading-tight tracking-tight">{T.title.toUpperCase()}</h1>
              <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-red-500">{T.subtitle} Hub {isSyncing ? '...' : ''}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             {cloudUrl && (
               <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'}`}></div>
             )}
             <button onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black border border-white/20 uppercase tracking-[0.2em]">{lang}</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 z-10 overflow-y-auto no-scrollbar">
        {activeTab === 'upload' && (
          <form onSubmit={handleAddRecord} className="bg-white p-8 rounded-[3rem] shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black font-washi" style={{ color: NARA_COLORS.SUMI_BLACK }}>{T.upload}</h2>
              <div className="h-1 w-12 bg-red-700 rounded-full"></div>
            </div>
            
            <div className="space-y-3 relative group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 block font-washi">{T.date}</label>
              <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-xl transition-all">
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-6 bg-slate-900 text-white font-black font-washi text-xl outline-none focus:ring-4 focus:ring-red-500/20" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <WashiSelect label={T.guide} value={formData.guide} options={Object.fromEntries(GUIDES.map(g => [g, g]))} onChange={(val: string) => setFormData({...formData, guide: val})} />
              <WashiSelect label={T.type} value={formData.type} options={T.tours} onChange={(val: TourType) => setFormData({...formData, type: val})} />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 block font-washi">{T.duration}</label>
              <div className="grid grid-cols-2 gap-4">
                {[2, 3].map(h => (
                  <button key={h} type="button" onClick={() => setFormData({ ...formData, duration: h })} className={`py-5 rounded-3xl font-black text-lg transition-all border-4 ${formData.duration === h ? 'bg-red-700 text-white border-red-700 shadow-xl scale-105' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                    {h}{lang === 'ja' ? '時間' : 'h'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 mb-2.5 block font-washi uppercase tracking-[0.2em]">{T.revenue}</label>
                <input type="text" inputMode="numeric" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-xl pl-9 shadow-inner focus:bg-white focus:border-red-500 transition-all outline-none" placeholder="0" />
                <span className="absolute left-4 top-[2.9rem] text-slate-300 text-lg font-black">¥</span>
              </div>
              <WashiSelect label={T.guests} value={formData.guests} options={Object.fromEntries(Array.from({length: 15}, (_, i) => [String(i + 1), `${i + 1} PAX`]))} onChange={(val: string) => setFormData({...formData, guests: val})} />
            </div>

            <button type="submit" className="w-full bg-red-700 text-white font-black py-6 rounded-[2.5rem] text-xl font-washi active:scale-[0.96] transition-all shadow-2xl flex items-center justify-center space-x-3">
              <span>{T.save}</span>
              {isSyncing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>}
            </button>
          </form>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
             <div className="bg-white p-6 rounded-[3.5rem] shadow-xl border border-slate-50">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-4">{T.revenueTrend}</h3>
                <GrowthChart data={chartData} />
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-center mt-4">* values in thousands (k)</p>
             </div>

             {Object.entries(nestedStats).sort((a,b) => b[0].localeCompare(a[0])).map(([year, yearData]: any) => (
               <div key={year} className="space-y-6">
                 <div className="bg-slate-900 text-white p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><WonderlandLogo className="w-32 h-32" /></div>
                    <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{T.yearly}</p>
                    <h2 className="text-4xl font-black font-washi mb-4">{year}</h2>
                    <div className="grid grid-cols-2 gap-4">
                       <div><p className="text-[9px] text-slate-400 uppercase font-black">{T.revenue}</p><p className="text-xl font-black">¥{yearData.rev.toLocaleString()}</p></div>
                       <div><p className="text-[9px] text-slate-400 uppercase font-black">{T.guests}</p><p className="text-xl font-black">{yearData.pax} PAX</p></div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-5">
                   {Object.entries(yearData.quarters).map(([q, qData]: any) => (
                     <div key={q} className="bg-white p-6 rounded-[3rem] shadow-xl border-t-8 border-red-700">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{T[`q${q}`]}</p>
                        <p className="text-lg font-black leading-tight">¥{qData.rev.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">{qData.pax} PAX</p>
                     </div>
                   ))}
                 </div>
               </div>
             ))}
             
             <div className="bg-slate-900 text-white p-8 rounded-[3.5rem] shadow-2xl relative">
                <h3 className="text-lg font-black font-washi mb-4 flex items-center space-x-3 text-amber-400"><span>{T.aiInsights}</span></h3>
                <div className="text-xs leading-[1.8] opacity-80 font-washi whitespace-pre-wrap min-h-[100px]">{aiInsight || T.aiPlaceholder}</div>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing || records.length === 0} className="w-full bg-red-700 text-white font-black py-4 rounded-full text-xs mt-8 active:scale-95 disabled:opacity-30">
                   {isAnalyzing ? T.aiAnalyzing : T.aiAnalyzeBtn}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-700">
             {records.length === 0 ? (
               <div className="py-32 text-center opacity-20"><p className="font-black tracking-[0.5em] font-washi uppercase">{T.noRecords}</p></div>
             ) : (
               <>
                 <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{records.length} {T.history}</p>
                    <button onClick={handleDownloadCSV} className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-full uppercase tracking-widest shadow-lg active:scale-95 transition-all">{T.downloadCSV}</button>
                 </div>

                 {groupedHistory.map(([monthKey, group]) => {
                   const [year, month] = monthKey.split('-');
                   return (
                     <div key={monthKey} className="space-y-6">
                        <div className="sticky top-24 z-10 bg-slate-100/80 backdrop-blur-md px-6 py-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
                           <div>
                              <h3 className="text-lg font-black font-washi text-slate-900">{year}年 {parseInt(month)}月</h3>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{group.items.length} {T.history}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-black text-red-700 uppercase tracking-widest mb-0.5">{T.revenue.toUpperCase()}</p>
                              <p className="text-lg font-black text-slate-900">¥{group.totalRev.toLocaleString()}</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           {group.items.map(r => (
                             <RecordCard key={r.id} record={r} lang={lang} onDelete={handleSafeDelete} />
                           ))}
                        </div>
                     </div>
                   );
                 })}
               </>
             )}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl text-center mt-2 border-4 border-slate-50 animate-in fade-in zoom-in duration-500">
               <div className="space-y-8">
                  <div className="text-left bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
                    <h3 className="text-sm font-black font-washi mb-4 flex items-center space-x-2 text-slate-900 uppercase tracking-widest">
                      <div className="w-8 h-8 bg-red-700 text-white rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                      </div>
                      <span>{T.dataSync}</span>
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-6 leading-relaxed">{T.syncWarning}</p>
                    
                    <div className="space-y-5">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{T.syncUrlLabel}</label>
                         <input 
                           type="text" 
                           value={cloudUrl} 
                           onChange={e => setCloudUrl(e.target.value)} 
                           className="w-full p-4 bg-white rounded-2xl font-bold text-xs border-2 border-slate-200 outline-none focus:border-red-700 transition-all shadow-sm" 
                           placeholder="https://script.google.com/macros/s/..." 
                         />
                       </div>
                       
                       <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{T.autoSync}</span>
                            <button onClick={() => setAutoSync(!autoSync)} className={`w-12 h-6 rounded-full transition-all relative ${autoSync ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}>
                               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${autoSync ? 'left-7' : 'left-1'}`}></div>
                            </button>
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold leading-relaxed">{T.autoSyncDesc}</p>
                       </div>

                       <button 
                         onClick={() => performCloudSync(true)} 
                         disabled={isSyncing || !cloudUrl} 
                         className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-3 active:scale-95 disabled:opacity-20 transition-all shadow-xl hover:bg-slate-800"
                       >
                          <svg className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" /></svg>
                          <span>{T.syncNow}</span>
                       </button>
                       
                       {cloudUrl && (
                         <div className="pt-2 text-center">
                            <p className="text-[8px] text-slate-400 font-bold tracking-widest mb-4">{T.lastSync}: {lastSyncTime || '---'}</p>
                            <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-2 text-[10px] font-black text-green-600 uppercase tracking-widest py-2 px-4 bg-green-50 rounded-full border border-green-100 active:scale-95 transition-all">
                               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                               <span>Spreadsheet</span>
                            </a>
                         </div>
                       )}
                    </div>
                  </div>
               </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-20 glass flex justify-around items-center rounded-full shadow-2xl z-50 border border-white/60 backdrop-blur-3xl px-2 animate-in slide-in-from-bottom-20 duration-500">
        <button onClick={() => setActiveTab('upload')} className={`relative p-4 transition-all duration-500 rounded-full ${activeTab === 'upload' ? 'bg-red-700 text-white shadow-xl -translate-y-4 scale-125' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`p-4 transition-all duration-500 rounded-full ${activeTab === 'dashboard' ? 'bg-slate-900 text-amber-400 shadow-xl -translate-y-4 scale-125' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        </button>
        <button onClick={() => setActiveTab('history')} className={`p-4 transition-all duration-500 rounded-full ${activeTab === 'history' ? 'bg-slate-900 text-amber-400 shadow-xl -translate-y-4 scale-125' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => setActiveTab('admin')} className={`p-4 transition-all duration-500 rounded-full ${activeTab === 'admin' ? 'bg-slate-900 text-amber-400 shadow-xl -translate-y-4 scale-125' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </nav>
    </div>
  );
};

export default App;
