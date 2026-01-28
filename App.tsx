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
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2.5 ml-1 block font-washi">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:bg-white outline-none transition-all font-bold text-slate-900 shadow-sm flex items-center justify-between active:scale-[0.98]"
      >
        <span className="truncate font-washi">{options[value] || value}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {Object.entries(options).map(([val, label]) => (
              <button key={val} type="button" className={`w-full text-left px-6 py-3 text-sm font-bold font-washi transition-colors hover:bg-amber-50 ${value === val ? 'text-amber-800 bg-amber-50' : 'text-slate-700'}`} onClick={() => { onChange(val); setIsOpen(false); }}>
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
    const result = await analyzeRecords(records);
    setAiInsight(result || null);
    setIsAnalyzing(false);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) { setIsAdmin(true); localStorage.setItem('is_admin', 'true'); setActiveTab('dashboard'); setPasswordInput(''); }
    else alert('Passcode Error');
  };

  const handleLogout = () => { setIsAdmin(false); localStorage.removeItem('is_admin'); setActiveTab('upload'); };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24 relative overflow-hidden" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-6 pt-12 rounded-b-[3rem] shadow-xl z-20 sticky top-0" style={{ backgroundColor: NARA_COLORS.TORII_RED, color: 'white' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <WonderlandLogo className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-black font-washi leading-tight">Wonderland</h1>
              <p className="text-[8px] font-bold tracking-[0.4em] uppercase opacity-80">Japan Admin</p>
            </div>
          </div>
          <button onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} className="bg-white/20 px-3 py-1.5 rounded-full text-[10px] font-black border border-white/20 uppercase tracking-widest">{lang}</button>
        </div>
      </header>

      <main className="flex-1 p-5 z-10 overflow-y-auto no-scrollbar">
        {activeTab === 'upload' && (
          <form onSubmit={handleAddRecord} className="bg-white p-8 rounded-[3rem] shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black font-washi mb-2" style={{ color: NARA_COLORS.DEER_BROWN }}>{T.upload}</h2>
            
            {/* 新設計的日期選取組件：具有 sense 的大型按鈕設計 */}
            <div className="space-y-2 relative group">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 block font-washi">SERVICE DATE / 實施日期</label>
              <div className="relative">
                <div className="w-full p-5 bg-slate-900 rounded-[2rem] border-4 border-slate-100 shadow-2xl flex items-center space-x-4 transition-all group-active:scale-[0.97]">
                  <div className="bg-red-600 p-3 rounded-2xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Select Date</p>
                    <p className="text-xl text-white font-black font-washi tracking-tighter">
                      {formData.date.split('-').join(' / ')}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                {/* 隱藏但覆蓋整個區域的 input，確保點擊任何地方都能喚醒日曆 */}
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <WashiSelect label={T.guide} value={formData.guide} options={Object.fromEntries(GUIDES.map(g => [g, g]))} onChange={(val: string) => setFormData({...formData, guide: val})} />
              <WashiSelect label={T.type} value={formData.type} options={T.tours} onChange={(val: TourType) => setFormData({...formData, type: val})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-[11px] font-black text-slate-500 mb-2 block font-washi">{T.revenue}</label>
                <input type="text" inputMode="numeric" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg pl-8 shadow-inner" placeholder="0" />
                <span className="absolute left-3 top-[2.7rem] text-slate-400 text-sm">¥</span>
              </div>
              <WashiSelect label={T.guests} value={formData.guests} options={Object.fromEntries(Array.from({length: 15}, (_, i) => [String(i + 1), `${i + 1}人`]))} onChange={(val: string) => setFormData({...formData, guests: val})} />
            </div>

            <button type="submit" className="w-full bg-red-700 text-white font-black py-5 rounded-[2.5rem] text-lg font-washi tracking-widest active:scale-95 transition-all shadow-xl hover:bg-red-800 flex items-center justify-center space-x-3">
              <span>{T.save}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" /></svg>
            </button>
          </form>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border-b-8 border-red-600">
                 <p className="text-slate-400 text-[9px] font-black mb-1 uppercase tracking-tighter">總營收</p>
                 <p className="text-xl font-black">¥{stats.totalRevenue.toLocaleString()}</p>
               </div>
               <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border-b-8 border-amber-500">
                 <p className="text-slate-400 text-[9px] font-black mb-1 uppercase tracking-tighter">總客數</p>
                 <p className="text-xl font-black">{stats.totalGuests} PAX</p>
               </div>
             </div>
             <div className="bg-white p-8 rounded-[3rem] shadow-lg">
                <h3 className="text-sm font-black font-washi mb-6 text-slate-400 uppercase tracking-widest">各類營收佔比</h3>
                <div className="space-y-4">
                   {Object.entries(stats.revenueByTour).map(([type, rev]: [any, any]) => (
                     rev > 0 && (
                       <div key={type} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                             <span>{type}</span>
                             <span>¥{rev.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full transition-all duration-1000" style={{ width: `${(rev / (stats.totalRevenue || 1)) * 100}%`, backgroundColor: TOUR_COLORS[type as TourType] }}></div>
                          </div>
                       </div>
                     )
                   ))}
                </div>
             </div>
             <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl">
                <h3 className="text-sm font-black font-washi mb-4 flex items-center">
                   <span className="text-amber-400 mr-2">✦</span> AI 經營策略洞察
                </h3>
                <div className="text-xs leading-relaxed opacity-90 font-washi whitespace-pre-wrap min-h-[100px]">{aiInsight || '點擊下方按鈕，AI 將為您分析數據並提供建議'}</div>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing || records.length === 0} className="w-full bg-white text-slate-900 font-black py-4 rounded-full text-xs mt-6 active:scale-95 transition-all disabled:opacity-30 shadow-lg">
                   {isAnalyzing ? '分析中...' : '生成 AI 報告'}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
             {records.length === 0 ? (
               <div className="py-20 text-center opacity-20 font-black tracking-widest font-washi">NO RECORDS</div>
             ) : (
               records.map(r => <RecordCard key={r.id} record={r} onDelete={(id) => setRecords(prev => prev.filter(x => x.id !== id))} />)
             )}
          </div>
        )}

        {(activeTab === 'admin' || (!isAdmin && (activeTab === 'dashboard' || activeTab === 'history'))) && (
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center mt-6">
            {isAdmin ? (
               <div className="py-10">
                  <div className="bg-green-50 text-green-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <h2 className="text-xl font-black font-washi mb-8">管理者身分已驗證</h2>
                  <button onClick={handleLogout} className="bg-slate-100 px-10 py-4 rounded-full font-black text-[10px] tracking-widest uppercase border border-slate-200 hover:bg-slate-200 transition-colors">Logout / 登出</button>
               </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-10 py-4">
                <div className="bg-slate-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto shadow-inner border-4 border-white">
                  <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black font-washi">Manager Access</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enter Secure Passcode</p>
                </div>
                <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-6 bg-slate-50 rounded-3xl text-center text-4xl font-black focus:border-red-600 outline-none border-4 border-slate-100 transition-all" placeholder="••••" required />
                <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-full text-lg font-washi shadow-xl active:scale-95 transition-all">UNLOCK SYSTEM</button>
              </form>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-20 glass px-10 flex justify-between items-center rounded-full shadow-2xl z-50 border border-white/50">
        <button onClick={() => setActiveTab('upload')} className={`transition-all duration-300 ${activeTab === 'upload' ? 'text-red-700 scale-125' : 'text-slate-300'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`transition-all duration-300 ${activeTab === 'dashboard' ? 'text-red-700 scale-125' : 'text-slate-300'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        </button>
        <button onClick={() => setActiveTab('history')} className={`transition-all duration-300 ${activeTab === 'history' ? 'text-red-700 scale-125' : 'text-slate-300'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => setActiveTab('admin')} className={`transition-all duration-300 ${activeTab === 'admin' ? 'text-red-700 scale-125' : 'text-slate-300'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        </button>
      </nav>
    </div>
  );
};

export default App;