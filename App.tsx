import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TourType, TourRecord, Language } from './types.ts';
import { TOUR_COLORS, TOUR_ICONS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES } from './constants.tsx';
import RecordCard from './components/RecordCard.tsx';
import { analyzeRecords } from './services/geminiService.ts';

const ADMIN_PASSWORD = '2025';

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

  const T = TRANSLATIONS[lang];

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: TourType.GION_WALK,
    guide: GUIDES[0],
    revenue: '',
    guests: '1',
    duration: 3
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tour_records');
      if (saved) setRecords(JSON.parse(saved));
      const savedAdmin = localStorage.getItem('is_admin');
      if (savedAdmin === 'true') setIsAdmin(true);
    } catch (e) {
      console.error("Storage load failed", e);
    }
  }, []);

  useEffect(() => { 
    localStorage.setItem('tour_records', JSON.stringify(records)); 
  }, [records]);

  const stats = useMemo(() => {
    return records.reduce((acc, curr) => {
      acc.totalRevenue += curr.revenue;
      acc.totalGuests += curr.guests;
      acc.totalHours += curr.duration;
      acc.revenueByTour[curr.type] = (acc.revenueByTour[curr.type] || 0) + curr.revenue;
      return acc;
    }, { totalRevenue: 0, totalGuests: 0, totalHours: 0, revenueByTour: {} as any });
  }, [records]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.revenue && formData.type !== TourType.FREE_TOUR) {
      alert('金額を入力してください');
      return;
    }
    const newRecord: TourRecord = { id: crypto.randomUUID(), date: formData.date, type: formData.type, guide: formData.guide, revenue: Number(formData.revenue.replace(/,/g, '') || 0), guests: Number(formData.guests), duration: formData.duration, createdAt: Date.now() };
    setRecords(prev => [newRecord, ...prev]);
    setFormData({ ...formData, revenue: '', guests: '1' });
    alert(lang === 'ja' ? '記録を保存しました' : 'Record saved!');
  };

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeRecords(records);
      setAiInsight(result || null);
    } catch (err) {
      setAiInsight("AI 分析暫時不可用。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) { setIsAdmin(true); localStorage.setItem('is_admin', 'true'); setActiveTab('dashboard'); setPasswordInput(''); }
    else alert('Passcode Error');
  };

  const handleLogout = () => { setIsAdmin(false); localStorage.removeItem('is_admin'); setActiveTab('upload'); };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24 relative overflow-hidden" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-6 pt-12 rounded-b-[2.5rem] shadow-2xl z-20 sticky top-0 bg-slate-900 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-red-700 p-2 rounded-xl shadow-lg shadow-red-900/40">
               <WonderlandLogo className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black font-washi leading-tight tracking-tight">WONDERLAND</h1>
              <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-red-500">Japan Admin Hub</p>
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 block font-washi">Service Date / 實施日期</label>
              <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-xl transition-all active:scale-[0.98]">
                <div className="w-full p-6 bg-slate-900 flex items-center space-x-6">
                  <div className="flex flex-col items-center justify-center bg-red-700 w-16 h-16 rounded-[1.8rem] shadow-lg shadow-red-900/50">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-red-500 font-black tracking-widest uppercase mb-1">Confirming for:</p>
                    <p className="text-2xl text-white font-black font-washi tracking-tighter">
                      {formData.date.split('-').map((s, i) => (
                        <span key={i} className="inline-block">
                          {s}{i < 2 ? <span className="text-slate-700 mx-1">/</span> : ''}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 date-input-overlay"
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
              <WashiSelect label={T.guests} value={formData.guests} options={Object.fromEntries(Array.from({length: 15}, (_, i) => [String(i + 1), `${i + 1}人`]))} onChange={(val: string) => setFormData({...formData, guests: val})} />
            </div>

            <button type="submit" className="w-full bg-red-700 text-white font-black py-6 rounded-[2.5rem] text-xl font-washi tracking-[0.2em] active:scale-[0.96] transition-all shadow-2xl shadow-red-900/30 flex items-center justify-center space-x-4">
              <span>{T.save}</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" /></svg>
            </button>
          </form>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
             <div className="grid grid-cols-2 gap-5">
               <div className="bg-white p-7 rounded-[3rem] shadow-xl border-b-[12px] border-red-700 relative overflow-hidden">
                 <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-[0.1em]">Revenue</p>
                 <p className="text-2xl font-black">¥{stats.totalRevenue.toLocaleString()}</p>
               </div>
               <div className="bg-white p-7 rounded-[3rem] shadow-xl border-b-[12px] border-amber-500 relative overflow-hidden">
                 <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-[0.1em]">Guests</p>
                 <p className="text-2xl font-black">{stats.totalGuests} PAX</p>
               </div>
             </div>
             
             <div className="bg-slate-900 text-white p-8 rounded-[3.5rem] shadow-2xl relative">
                <h3 className="text-lg font-black font-washi mb-4 flex items-center space-x-3 text-amber-400">
                   <span>✦ AI Insights</span>
                </h3>
                <div className="text-xs leading-[1.8] opacity-80 font-washi whitespace-pre-wrap min-h-[100px]">
                  {aiInsight || '點擊下方按鈕，AI 顧問將為您解析經營現況。'}
                </div>
                <button 
                  onClick={handleAiAnalyze} 
                  disabled={isAnalyzing || records.length === 0} 
                  className="w-full bg-red-700 text-white font-black py-4 rounded-full text-xs mt-8 active:scale-95 transition-all disabled:opacity-30 border border-red-500/30"
                >
                   {isAnalyzing ? '分析中...' : '生成經營分析報告'}
                </button>
             </div>
          </div>
        )}

        {(activeTab === 'history' && isAdmin) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-8 duration-700">
             {records.length === 0 ? (
               <div className="py-32 text-center opacity-20">
                 <p className="font-black tracking-[0.5em] font-washi uppercase">No Records</p>
               </div>
             ) : (
               records.map(r => <RecordCard key={r.id} record={r} onDelete={(id) => { if(confirm('刪除此紀錄？')) setRecords(prev => prev.filter(x => x.id !== id)) }} />)
             )}
          </div>
        )}

        {(activeTab === 'admin' || (!isAdmin && (activeTab === 'dashboard' || activeTab === 'history'))) && (
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center mt-6 border-4 border-slate-50">
            {isAdmin ? (
               <div className="py-6">
                  <h2 className="text-2xl font-black font-washi mb-4">管理者認證成功</h2>
                  <button onClick={handleLogout} className="w-full bg-slate-900 text-white px-10 py-5 rounded-full font-black text-xs tracking-[0.3em] uppercase">退出管理者模式</button>
               </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-12">
                <h2 className="text-3xl font-black font-washi tracking-tighter">SECURE ACCESS</h2>
                <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-6 bg-slate-50 rounded-[2rem] text-center text-4xl font-black focus:border-red-700 outline-none border-4 border-slate-100 tracking-[0.5em]" placeholder="••••" required />
                <button type="submit" className="w-full bg-red-700 text-white font-black py-6 rounded-full text-lg font-washi shadow-2xl active:scale-95 transition-all">AUTHENTICATE</button>
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