import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TourType, TourRecord, Language } from './types';
import { TOUR_COLORS, TOUR_ICONS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES } from './constants';
import RecordCard from './components/RecordCard';
import { analyzeRecords } from './services/geminiService';

const ADMIN_PASSWORD = '2025';
const DELETE_PASSWORD = '0124';

const GrowthChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const width = 400;
  const height = 150;
  const padding = 20;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (width - padding * 2) + padding;
    const y = height - (d.value / max) * (height - padding * 2) - padding;
    return { x, y };
  });

  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaPath = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="w-full h-[180px] mt-4 overflow-hidden rounded-[2rem] bg-slate-50 border border-slate-100 relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#AF2020" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#AF2020" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGradient)" />
        <path d={path} fill="none" stroke="#AF2020" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#AF2020" strokeWidth="2" />
        ))}
      </svg>
      <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4">
        {data.map((d, i) => (
          <span key={i} className="text-[8px] font-black text-slate-400 uppercase">{d.label}</span>
        ))}
      </div>
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [records, setRecords] = useState<TourRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'history' | 'admin'>('upload');
  const [passwordInput, setPasswordInput] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportEmail, setExportEmail] = useState('info@wonderlandjapan.net');

  const T = TRANSLATIONS[lang];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tour_records');
      if (saved) setRecords(JSON.parse(saved));
      const savedAdmin = localStorage.getItem('is_admin');
      if (savedAdmin === 'true') setIsAdmin(true);
      const savedEmail = localStorage.getItem('export_email');
      if (savedEmail) setExportEmail(savedEmail);
    } catch (e) {
      console.error("Storage load failed", e);
    }
  }, []);

  useEffect(() => { 
    localStorage.setItem('tour_records', JSON.stringify(records)); 
    localStorage.setItem('export_email', exportEmail);
  }, [records, exportEmail]);

  // Nested grouping: Year -> Quarter -> Month
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

  // Data points for the SVG growth chart
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
    setRecords(prev => [newRecord, ...prev]);
    setFormData({ ...formData, revenue: '', guests: '1' });
    alert(T.saveSuccess);
  };

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
    const rows = records.map(r => [
      r.date,
      T.tours[r.type],
      r.guide,
      r.revenue,
      r.guests,
      r.duration
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // FIX: Add UTF-8 BOM (\uFEFF) to prevent garbled characters in Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wonderland_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendEmail = () => {
    if (records.length === 0) {
      alert(T.noRecords);
      return;
    }

    const reportDate = new Date().toLocaleDateString();
    const subject = `${T.emailSubject} - ${reportDate}`;
    
    const stats = records.reduce((acc, curr) => {
      acc.rev += curr.revenue;
      acc.pax += curr.guests;
      return acc;
    }, { rev: 0, pax: 0 });

    let body = `${T.emailHeader} (${reportDate})\n\n`;
    body += `${T.revenue}: ¥${stats.rev.toLocaleString()}\n`;
    body += `${T.guests}: ${stats.pax} PAX\n\n`;
    body += `${T.emailDetail}\n`;
    
    records.forEach(r => {
      body += `[${r.date}] ${T.tours[r.type]} | ${r.guide} | ¥${r.revenue.toLocaleString()} | ${r.guests} PAX\n`;
    });

    const mailtoUrl = `mailto:${exportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
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

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) { 
      setIsAdmin(true); 
      localStorage.setItem('is_admin', 'true'); 
      setActiveTab('dashboard'); 
      setPasswordInput(''); 
    } else {
      alert('Passcode Error');
    }
  };

  const handleLogout = () => { 
    setIsAdmin(false); 
    localStorage.removeItem('is_admin'); 
    setActiveTab('upload'); 
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24 relative overflow-hidden" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-6 pt-12 rounded-b-[2.5rem] shadow-2xl z-20 sticky top-0 bg-slate-900 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-red-700 p-2 rounded-xl shadow-lg shadow-red-900/40">
               <WonderlandLogo className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black font-washi leading-tight tracking-tight">{T.title.toUpperCase()}</h1>
              <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-red-500">{T.subtitle} Admin Hub</p>
            </div>
          </div>
          <button onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black border border-white/20 uppercase tracking-[0.2em]">{lang}</button>
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
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="w-full p-6 bg-slate-900 text-white font-black font-washi text-xl outline-none focus:ring-4 focus:ring-red-500/20"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <WashiSelect label={T.guide} value={formData.guide} options={Object.fromEntries(GUIDES.map(g => [g, g]))} onChange={(val: string) => setFormData({...formData, guide: val})} />
              <WashiSelect label={T.type} value={formData.type} options={T.tours} onChange={(val: TourType) => setFormData({...formData, type: val})} />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 mb-2.5 block font-washi uppercase tracking-[0.2em]">{T.revenue}</label>
                <input type="text" inputMode="numeric" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-xl pl-9 shadow-inner focus:bg-white focus:border-red-500 transition-all outline-none" placeholder="0" />
                <span className="absolute left-4 top-[2.9rem] text-slate-300 text-lg font-black">¥</span>
              </div>
              <WashiSelect label={T.guests} value={formData.guests} options={Object.fromEntries(Array.from({length: 15}, (_, i) => [String(i + 1), `${i + 1} PAX`]))} onChange={(val: string) => setFormData({...formData, guests: val})} />
            </div>

            <button type="submit" className="w-full bg-red-700 text-white font-black py-6 rounded-[2.5rem] text-xl font-washi active:scale-[0.96] transition-all shadow-2xl">
              <span>{T.save}</span>
            </button>
          </form>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
             {/* Growth Chart */}
             <div className="bg-white p-6 rounded-[3.5rem] shadow-xl border border-slate-50">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-4">{T.revenueTrend}</h3>
                <GrowthChart data={chartData} />
             </div>

             {/* Nested Summary */}
             {Object.entries(nestedStats).sort((a,b) => b[0].localeCompare(a[0])).map(([year, yearData]: any) => (
               <div key={year} className="space-y-6">
                 {/* Year Card */}
                 <div className="bg-slate-900 text-white p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                       <WonderlandLogo className="w-32 h-32" />
                    </div>
                    <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{T.yearly}</p>
                    <h2 className="text-4xl font-black font-washi mb-4">{year}</h2>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <p className="text-[9px] text-slate-400 uppercase font-black">{T.revenue}</p>
                          <p className="text-xl font-black">¥{yearData.rev.toLocaleString()}</p>
                       </div>
                       <div>
                          <p className="text-[9px] text-slate-400 uppercase font-black">{T.guests}</p>
                          <p className="text-xl font-black">{yearData.pax} PAX</p>
                       </div>
                    </div>
                 </div>

                 {/* Quarter Grid */}
                 <div className="grid grid-cols-2 gap-5">
                   {Object.entries(yearData.quarters).map(([q, qData]: any) => (
                     <div key={q} className="bg-white p-6 rounded-[3rem] shadow-xl border-t-8 border-red-700 transition-all active:scale-95">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{T[`q${q}`]}</p>
                        <p className="text-lg font-black leading-tight">¥{qData.rev.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">{qData.pax} PAX</p>
                     </div>
                   ))}
                 </div>
               </div>
             ))}
             
             {/* AI Section */}
             <div className="bg-slate-900 text-white p-8 rounded-[3.5rem] shadow-2xl relative">
                <h3 className="text-lg font-black font-washi mb-4 flex items-center space-x-3 text-amber-400">
                   <span>{T.aiInsights}</span>
                </h3>
                <div className="text-xs leading-[1.8] opacity-80 font-washi whitespace-pre-wrap min-h-[100px]">
                  {aiInsight || T.aiPlaceholder}
                </div>
                <button 
                  onClick={handleAiAnalyze} 
                  disabled={isAnalyzing || records.length === 0} 
                  className="w-full bg-red-700 text-white font-black py-4 rounded-full text-xs mt-8 active:scale-95 transition-all disabled:opacity-30"
                >
                   {isAnalyzing ? T.aiAnalyzing : T.aiAnalyzeBtn}
                </button>
             </div>

             {/* Export Controls */}
             <div className="bg-white p-8 rounded-[3rem] shadow-xl space-y-4">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Export Hub</h3>
               <input 
                 type="email" 
                 value={exportEmail} 
                 onChange={e => setExportEmail(e.target.value)} 
                 className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-red-700 font-bold"
                 placeholder={T.emailPlaceholder}
               />
               <div className="grid grid-cols-2 gap-4">
                 <button onClick={handleSendEmail} className="bg-white border-2 border-slate-100 p-4 rounded-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all">
                   <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                   <span className="text-[10px] font-black font-washi">{T.exportReport}</span>
                 </button>
                 <button onClick={handleDownloadCSV} className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all">
                   <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   <span className="text-[10px] font-black font-washi">{T.downloadCSV}</span>
                 </button>
               </div>
             </div>
          </div>
        )}

        {(activeTab === 'history' && isAdmin) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-8 duration-700">
             {records.length === 0 ? (
               <div className="py-32 text-center opacity-20">
                 <p className="font-black tracking-[0.5em] font-washi uppercase">{T.noRecords}</p>
               </div>
             ) : (
               <>
                 <div className="flex justify-end space-x-3 mb-4">
                    <button onClick={handleDownloadCSV} className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">{T.downloadCSV}</button>
                 </div>
                 {records.map(r => <RecordCard key={r.id} record={r} lang={lang} onDelete={handleSafeDelete} />)}
               </>
             )}
          </div>
        )}

        {(activeTab === 'admin' || (!isAdmin && (activeTab === 'dashboard' || activeTab === 'history'))) && (
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center mt-6 border-4 border-slate-50">
            {isAdmin ? (
               <div className="py-6">
                  <h2 className="text-2xl font-black font-washi mb-4">{T.adminSuccess}</h2>
                  <button onClick={handleLogout} className="w-full bg-slate-900 text-white px-10 py-5 rounded-full font-black text-xs tracking-[0.3em] uppercase">{T.logout}</button>
               </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-12">
                <h2 className="text-3xl font-black font-washi tracking-tighter uppercase">{T.adminLogin}</h2>
                <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-6 bg-slate-50 rounded-[2rem] text-center text-4xl font-black focus:border-red-700 outline-none border-4 border-slate-100 tracking-[0.5em]" placeholder="••••" required />
                <button type="submit" className="w-full bg-red-700 text-white font-black py-6 rounded-full text-lg font-washi shadow-2xl active:scale-95 transition-all">{T.unlock}</button>
              </form>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-8 right-8 h-24 glass px-12 flex justify-between items-center rounded-full shadow-2xl z-50 border border-white/60">
        <button onClick={() => setActiveTab('upload')} className={`transition-all duration-300 ${activeTab === 'upload' ? 'text-red-700 scale-125' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`transition-all duration-300 ${activeTab === 'dashboard' ? 'text-red-700 scale-125' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        </button>
        <button onClick={() => setActiveTab('history')} className={`transition-all duration-300 ${activeTab === 'history' ? 'text-red-700 scale-125' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => setActiveTab('admin')} className={`transition-all duration-300 ${activeTab === 'admin' ? 'text-red-700 scale-125' : 'text-slate-300'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        </button>
      </nav>
    </div>
  );
};

export default App;