
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TourType, TourRecord, Language } from './types';
import { TOUR_COLORS, TOUR_ICONS, TRANSLATIONS, NARA_COLORS, WonderlandLogo, GUIDES } from './constants';
import RecordCard from './RecordCard';
import { analyzeRecords } from './services/geminiService';

const ADMIN_PASSWORD = '2025';
const DELETE_PIN = '0124';

const GrowthChart: React.FC<{ data: { label: string; value: number }[], lang: Language }> = ({ data, lang }) => {
  const T = TRANSLATIONS[lang] || TRANSLATIONS.ja;
  const hasData = data.some(d => d.value > 0);
  
  if (!hasData) return (
    <div className="w-full h-[220px] flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-[10px] bg-slate-50/50 rounded-[2rem]">
      {lang === 'ja' ? 'データ収集中...' : 'Collecting Data...'}
    </div>
  );

  const max = Math.max(...data.map(d => d.value), 1);
  const width = 500;
  const height = 220;
  const paddingX = 40;
  const paddingY = 50;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (width - paddingX * 2) + paddingX;
    const y = height - (d.value / max) * (height - paddingY * 2) - paddingY;
    return { x, y, value: d.value, label: d.label };
  });

  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - 20} L ${points[0].x} ${height - 20} Z`;

  return (
    <div className="w-full mt-2 overflow-hidden rounded-[2.5rem] bg-white relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-sm">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#AF2020" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#AF2020" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = height - paddingY - p * (height - paddingY * 2);
          return <line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />;
        })}
        <path d={areaPath} fill="url(#areaGradient)" />
        <path d={path} fill="none" stroke="#AF2020" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="7" fill="white" stroke="#AF2020" strokeWidth="3" />
            {p.value > 0 && (
              <text x={p.x} y={p.y - 18} textAnchor="middle" className="fill-slate-900 font-black text-[12px]">
                ¥{(p.value / 1000).toFixed(0)}k
              </text>
            )}
            <text x={p.x} y={height - 15} textAnchor="middle" className="fill-slate-400 font-bold text-[10px] uppercase">
              {p.label}{T.monthUnit}
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
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 block font-washi">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:border-red-500 outline-none transition-all font-bold text-slate-900 shadow-sm flex items-center justify-between"
      >
        <span className="truncate">{options[value] || value}</span>
        <svg className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-2xl py-2 overflow-hidden max-h-60 overflow-y-auto no-scrollbar">
          {Object.entries(options).map(([val, label]) => (
            <button key={val} type="button" className="w-full text-left px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-red-50" onClick={() => { onChange(val); setIsOpen(false); }}>
              {label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [cloudUrl, setCloudUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  
  const isLoaded = useRef(false);
  const T = TRANSLATIONS[lang] || TRANSLATIONS.ja;
  const YEARS = Array.from({ length: 2030 - 2024 + 1 }, (_, i) => 2024 + i);

  // 1. 初始化讀取 (只跑一次)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tour_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setRecords(parsed);
      }
      
      const savedUrl = localStorage.getItem('cloud_sync_url');
      if (savedUrl) setCloudUrl(savedUrl);
      
      const savedAuto = localStorage.getItem('auto_sync');
      if (savedAuto) setAutoSync(savedAuto === 'true');
      
      const savedLast = localStorage.getItem('last_sync_time');
      if (savedLast) setLastSyncTime(savedLast);
      
      const savedAdmin = localStorage.getItem('is_admin');
      if (savedAdmin === 'true') setIsAdmin(true);
      
      // 標記讀取完成，允許後續保存
      isLoaded.current = true;

      // 如果有 URL，啟動時同步一次
      if (savedUrl) {
        setTimeout(() => performCloudSync(false), 500);
      }
    } catch (e) { 
      console.error("Init Error:", e);
      isLoaded.current = true; // 即使出錯也要標記，否則永遠無法保存
    }
  }, []);

  // 2. 狀態變動保存 (監聽 records)
  useEffect(() => { 
    // 重要：只有在 isLoaded 為 true 時才寫入 localStorage
    // 這防止了 App 啟動時用空的 [] 覆蓋掉有數據的存儲
    if (isLoaded.current) {
      localStorage.setItem('tour_records', JSON.stringify(records)); 
    }
  }, [records]);

  // 3. 其他設定保存
  useEffect(() => {
    localStorage.setItem('cloud_sync_url', cloudUrl);
    localStorage.setItem('auto_sync', String(autoSync));
    localStorage.setItem('is_admin', String(isAdmin));
    if (lastSyncTime) localStorage.setItem('last_sync_time', lastSyncTime);
  }, [cloudUrl, autoSync, isAdmin, lastSyncTime]);

  const performCloudSync = async (showAlert = true, overrideData?: TourRecord[]) => {
    const dataToSync = overrideData || records;
    if (!cloudUrl || !cloudUrl.startsWith('https://script.google.com')) {
      if (showAlert) alert(T.syncError);
      return;
    }
    setIsSyncing(true);
    try {
      // POST 模式：強制覆蓋雲端 (對刪除操作至關重要)
      await fetch(cloudUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'sync', data: dataToSync })
      });
      
      // GET 模式：抓取雲端最新結果進行本地合併
      const getResponse = await fetch(`${cloudUrl}?action=get`);
      const cloudData = await getResponse.json();
      if (Array.isArray(cloudData)) {
        // 合併邏輯：以雲端為主
        setRecords(cloudData.sort((a,b) => b.date.localeCompare(a.date)));
        setLastSyncTime(new Date().toLocaleString('ja-JP'));
        if (showAlert) alert(T.syncSuccess);
      }
    } catch (err) { 
      if (showAlert) alert(T.syncError); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPasswordInput('');
      if (targetTabAfterLogin) {
        setActiveTab(targetTabAfterLogin);
        setTargetTabAfterLogin(null);
      }
    } else {
      alert(lang === 'ja' ? 'パスワードが違います' : 'Incorrect Password');
    }
  };

  const handleTabSwitch = (tab: typeof activeTab) => {
    if (tab === 'dashboard' || tab === 'history' || tab === 'settings') {
      if (isAdmin) {
        setActiveTab(tab);
      } else {
        setTargetTabAfterLogin(tab);
        setShowLogin(true);
      }
    } else {
      setActiveTab(tab);
    }
  };

  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], type: TourType.GION_WALK, guide: GUIDES[0], revenue: '', guests: '1', duration: 3 });

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.revenue && formData.type !== TourType.FREE_TOUR) { alert(T.revenueError); return; }
    const newRecord: TourRecord = { id: crypto.randomUUID(), date: formData.date, type: formData.type, guide: formData.guide, revenue: Number(formData.revenue.replace(/,/g, '') || 0), guests: Number(formData.guests), duration: formData.duration, createdAt: Date.now() };
    const updated = [newRecord, ...records];
    setRecords(updated);
    setFormData({ ...formData, revenue: '', guests: '1', duration: 3 });
    alert(T.saveSuccess);
    if (autoSync && cloudUrl) performCloudSync(false, updated);
  };

  const handleDeleteRecord = async (id: string) => {
    const pin = prompt(T.deletePasswordPrompt);
    if (pin === DELETE_PIN) {
      const updatedRecords = records.filter(r => r.id !== id);
      // 立即更新本地狀態
      setRecords(updatedRecords);
      // 如果有雲端 URL，立即強制同步（Overwrite 模式），防止舊數據回載
      if (cloudUrl) {
        await performCloudSync(false, updatedRecords);
      }
    } else if (pin !== null) {
      alert(T.deletePasswordError);
    }
  };

  const handleAiAnalyze = async () => {
    if (records.length === 0) {
      setAiInsight(T.noRecords);
      return;
    }
    setIsAnalyzing(true);
    setAiInsight(null);
    try {
      const insight = await analyzeRecords(records, lang);
      setAiInsight(insight || T.aiError);
    } catch (err) { 
      setAiInsight(T.aiError); 
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Type', 'Guide', 'Revenue', 'Guests', 'Duration'];
    const rows = records.map(r => [r.date, r.type, r.guide, r.revenue, r.guests, r.duration]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wonderland_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statsForSelectedYear = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, rev: 0, pax: 0 }));
    let yearTotalRev = 0, yearTotalPax = 0;
    records.forEach(r => {
      const d = new Date(r.date);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        months[m].rev += r.revenue;
        months[m].pax += r.guests;
        yearTotalRev += r.revenue;
        yearTotalPax += r.guests;
      }
    });
    return { months, yearTotalRev, yearTotalPax };
  }, [records, selectedYear]);

  const chartData = useMemo(() => statsForSelectedYear.months.map(m => ({ label: `${m.month}`, value: m.rev })), [statsForSelectedYear]);

  const guestOptions = useMemo(() => {
    const unit = T.guestUnit || (lang === 'ja' ? '名' : 'PAX');
    return Object.fromEntries(Array.from({length: 15}, (_, i) => [String(i + 1), `${i + 1} ${unit}`]));
  }, [T.guestUnit, lang]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-32 relative overflow-hidden" style={{ backgroundColor: NARA_COLORS.WASHI_CREAM }}>
      <header className="p-6 pt-12 rounded-b-[2.5rem] shadow-2xl z-20 sticky top-0 bg-slate-900 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-red-700 p-2 rounded-xl shadow-lg"> <WonderlandLogo className="w-8 h-8" /> </div>
            <div>
              <h1 className="text-xl font-black font-washi leading-tight tracking-tight">{T.title.toUpperCase()}</h1>
              <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-red-500">{T.subtitle} Hub</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             {isAdmin && (
               <button onClick={() => setIsAdmin(false)} className="bg-red-500/20 text-red-400 text-[8px] font-black px-3 py-1 rounded-full border border-red-500/30 tracking-widest uppercase">Logout</button>
             )}
             <button onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black border border-white/20 uppercase tracking-[0.2em]">{lang}</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 z-10 overflow-y-auto no-scrollbar">
        {showLogin && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 shadow-2xl text-center space-y-8 animate-in zoom-in duration-500">
                <div className="bg-red-700 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl">
                   <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <h2 className="text-2xl font-black font-washi text-slate-900">{lang === 'ja' ? '管理者認證' : 'Admin PIN'}</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                   <input autoFocus type="password" inputMode="numeric" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="••••" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-4xl text-center tracking-[0.5em] outline-none focus:border-red-700 transition-all" />
                   <div className="flex space-x-3">
                      <button type="button" onClick={() => setShowLogin(false)} className="flex-1 py-5 rounded-[2rem] font-black text-slate-400 uppercase tracking-widest text-xs">Cancel</button>
                      <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Unlock</button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {/* 顯示分頁邏輯，確保非 Admin 時也會顯示基礎內容或導向登入 */}
        {(activeTab === 'upload' || !isAdmin) && (
          <form onSubmit={handleAddRecord} className="bg-white p-8 rounded-[3rem] shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h2 className="text-2xl font-black font-washi text-slate-900">{T.upload}</h2>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block font-washi">{T.date}</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-6 bg-slate-900 text-white font-black font-washi text-xl rounded-[2rem] outline-none" required />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <WashiSelect label={T.guide} value={formData.guide} options={Object.fromEntries(GUIDES.map(g => [g, g]))} onChange={(val: string) => setFormData({...formData, guide: val})} />
              <WashiSelect label={T.type} value={formData.type} options={T.tours} onChange={(val: TourType) => setFormData({...formData, type: val})} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block font-washi">{T.duration}</label>
              <div className="grid grid-cols-2 gap-4">
                {[2, 3].map(h => (
                  <button key={h} type="button" onClick={() => setFormData({ ...formData, duration: h })} className={`py-5 rounded-3xl font-black text-lg transition-all border-4 ${formData.duration === h ? 'bg-red-700 text-white border-red-700' : 'bg-slate-50 text-slate-300'}`}>
                    {h}{lang === 'ja' ? '時間' : 'h'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 mb-2.5 block font-washi uppercase tracking-[0.2em]">{T.revenue}</label>
                <input type="text" inputMode="numeric" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-xl pl-9 outline-none" placeholder="0" />
                <span className="absolute left-4 top-[2.9rem] text-slate-300 text-lg font-black">¥</span>
              </div>
              <WashiSelect label={T.guests} value={formData.guests} options={guestOptions} onChange={(val: string) => setFormData({...formData, guests: val})} />
            </div>
            <button type="submit" className="w-full bg-red-700 text-white font-black py-6 rounded-[2.5rem] text-xl font-washi active:scale-[0.96] transition-all shadow-2xl"> {T.save} </button>
          </form>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
             <div className="flex overflow-x-auto no-scrollbar py-2 space-x-3 -mx-6 px-6">
                {YEARS.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} className={`flex-shrink-0 px-7 py-3.5 rounded-full font-black text-xs transition-all border-2 ${selectedYear === y ? 'bg-red-700 text-white border-red-700 shadow-xl scale-110' : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}> {y} </button>
                ))}
             </div>
             <div className="bg-slate-900 text-white p-9 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2">{selectedYear} {T.yearly}</p>
                <h2 className="text-5xl font-black font-washi mb-8 tracking-tighter">¥{statsForSelectedYear.yearTotalRev.toLocaleString()}</h2>
                <div className="flex items-center space-x-6">
                   <div className="bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-inner text-center flex-1">
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-1">{T.guests}</p>
                      <p className="text-xl font-black">{statsForSelectedYear.yearTotalPax} {T.guestUnit}</p>
                   </div>
                   <div className="bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-inner text-center flex-1">
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-1">AVG PAX</p>
                      <p className="text-xl font-black">{(statsForSelectedYear.yearTotalPax / (records.filter(r => new Date(r.date).getFullYear() === selectedYear).length || 1)).toFixed(1)}</p>
                   </div>
                </div>
             </div>
             <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border border-slate-50/50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest font-washi mb-4">{T.revenueTrend} ({selectedYear})</h3>
                <GrowthChart data={chartData} lang={lang} />
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] text-center mt-6 leading-relaxed whitespace-pre-wrap">{T.chartFootnote}</p>
             </div>
             <div className="bg-slate-900 text-white p-9 rounded-[3.5rem] shadow-2xl relative border border-white/5 overflow-hidden">
                <h3 className="text-lg font-black font-washi mb-6 text-amber-400">{T.aiInsights}</h3>
                <div className="text-xs leading-[2] opacity-80 font-washi whitespace-pre-wrap min-h-[120px] prose prose-invert max-w-none">
                  {aiInsight || T.aiPlaceholder}
                </div>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing} className="w-full bg-red-700 text-white font-black py-5 rounded-full text-[10px] uppercase tracking-[0.3em] mt-10 active:scale-95 disabled:opacity-30"> {isAnalyzing ? T.aiAnalyzing : T.aiAnalyzeBtn} </button>
             </div>
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-8 duration-700">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black font-washi text-slate-900">{T.history}</h2>
                <button onClick={downloadCSV} className="text-[10px] font-black text-slate-400 border-2 border-slate-100 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-white transition-all">{T.downloadCSV}</button>
             </div>
             {records.length === 0 ? (
               <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">{T.noRecords}</div>
             ) : (
               records.map(r => <RecordCard key={r.id} record={r} lang={lang} onDelete={handleDeleteRecord} isAdmin={isAdmin} />)
             )}
          </div>
        )}

        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-8 animate-in fade-in zoom-in duration-700">
             <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl space-y-8">
                <h2 className="text-2xl font-black font-washi text-slate-900">{T.dataSync}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">{T.syncWarning}</p>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{T.syncUrlLabel}</label>
                   <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="https://script.google.com/..." className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-xs font-bold outline-none focus:border-red-700 transition-all" />
                </div>
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem]">
                   <div>
                      <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest">{T.autoSync}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{T.autoSyncDesc}</p>
                   </div>
                   <button onClick={() => setAutoSync(!autoSync)} className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${autoSync ? 'bg-red-700' : 'bg-slate-200'}`}>
                      <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform ${autoSync ? 'translate-x-6' : 'translate-x-0'}`} />
                   </button>
                </div>
                <button onClick={() => performCloudSync()} disabled={isSyncing} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] text-xs uppercase tracking-[0.3em] active:scale-95 disabled:opacity-30 flex items-center justify-center space-x-3">
                   {isSyncing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                   <span>{isSyncing ? 'SYNCING...' : T.syncNow}</span>
                </button>
                {lastSyncTime && <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">{T.lastSync}: {lastSyncTime}</p>}
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-20 glass flex justify-around items-center rounded-full shadow-2xl z-50 border border-white/60 backdrop-blur-3xl px-2">
        <button onClick={() => handleTabSwitch('upload')} className={`relative p-4 rounded-full transition-all ${activeTab === 'upload' ? 'bg-red-700 text-white shadow-xl -translate-y-4 scale-125' : 'text-slate-300 hover:text-red-700'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('dashboard')} className={`p-4 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-amber-400 shadow-xl -translate-y-4 scale-125' : 'text-slate-300 hover:text-slate-900'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('history')} className={`p-4 rounded-full transition-all ${activeTab === 'history' ? 'bg-slate-900 text-amber-400 shadow-xl -translate-y-4 scale-125' : 'text-slate-300 hover:text-slate-900'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <button onClick={() => handleTabSwitch('settings')} className={`p-4 rounded-full transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-amber-400 shadow-xl -translate-y-4 scale-125' : 'text-slate-300 hover:text-slate-900'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" /></svg>
        </button>
      </nav>
    </div>
  );
};

export default App;
