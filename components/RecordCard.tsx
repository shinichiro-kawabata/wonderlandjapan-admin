import React from 'react';
import { TourRecord, Language } from '../types';
import { TOUR_COLORS, TOUR_ICONS, TRANSLATIONS } from '../constants';

interface RecordCardProps {
  record: TourRecord;
  lang: Language;
  onDelete: (id: string) => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, lang, onDelete }) => {
  const T = TRANSLATIONS[lang];
  
  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] shadow-xl border border-white/50 p-7 mb-6 flex items-center justify-between group transition-all duration-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] hover:-translate-y-1">
      <div className="flex items-center space-x-6">
        <div 
          className="p-5 rounded-[2rem] text-white shadow-2xl transform transition-transform group-hover:rotate-6 duration-700" 
          style={{ backgroundColor: TOUR_COLORS[record.type] }}
        >
          {TOUR_ICONS[record.type]}
        </div>
        <div>
          <h4 className="font-black text-slate-900 text-lg tracking-tight font-washi">{T.tours[record.type]}</h4>
          <div className="flex items-center space-x-4 mt-1.5">
             <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">{record.date.replace(/-/g, '/')}</p>
             <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
             <span className="text-[10px] bg-amber-100/50 text-amber-900 px-4 py-1.5 rounded-full font-black border border-amber-200/50 shadow-inner font-washi">
               {record.guide}
             </span>
          </div>
          <div className="flex flex-wrap gap-2.5 mt-4">
            <span className="text-[11px] bg-white px-4 py-2 rounded-[1.2rem] text-slate-800 font-black border border-slate-100 shadow-sm">
              {record.revenue > 0 ? `¥${record.revenue.toLocaleString()}` : 'FREE'}
            </span>
            <span className="text-[11px] bg-white px-4 py-2 rounded-[1.2rem] text-slate-800 font-black border border-slate-100 shadow-sm">
              {record.guests} PAX
            </span>
            <span className="text-[11px] bg-white px-4 py-2 rounded-[1.2rem] text-slate-800 font-black border border-slate-100 shadow-sm uppercase">
              {record.duration} {lang === 'ja' ? '時間' : 'Hours'}
            </span>
          </div>
        </div>
      </div>
      <button 
        onClick={() => onDelete(record.id)}
        className="p-5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-[1.5rem] transition-all active:scale-90"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};

export default RecordCard;