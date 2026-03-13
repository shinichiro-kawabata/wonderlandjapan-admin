import React from 'react';
import { TourRecord, Language } from './types';
import { TOUR_COLORS, TRANSLATIONS, TOUR_ICONS } from './constants';
import { Trash2, Users, Clock, Calendar, Wallet } from 'lucide-react';

interface RecordCardProps {
  record: TourRecord;
  lang: Language;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
}

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

export const RecordCard: React.FC<RecordCardProps> = ({ record, lang, onDelete, isAdmin = false }) => {
  const T = TRANSLATIONS[lang] || TRANSLATIONS.ja;

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-amber-200/50 transition-all duration-500 group relative overflow-hidden">
      {/* Accent Line */}
      <div 
        className="absolute top-0 left-0 w-1.5 h-full transition-all duration-500 group-hover:w-2" 
        style={{ backgroundColor: TOUR_COLORS[record.type] }} 
      />

      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-5">
            <div 
              className="p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110 duration-500"
              style={{ backgroundColor: TOUR_COLORS[record.type] }}
            >
              {TOUR_ICONS[record.type]}
            </div>
            <div>
              <h4 className="text-xl font-serif-luxury font-medium text-slate-900 uppercase tracking-tight">
                {T.tours?.[record.type] || record.type}
              </h4>
              <div className="flex items-center space-x-3 mt-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  {formatDate(record.date, lang)}
                </p>
              </div>
            </div>
          </div>
          {isAdmin && (
            <button 
              onClick={() => onDelete(record.id)}
              className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-300"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center space-x-3">
            <Users className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{T.guide}</p>
              <p className="text-sm font-bold text-slate-900">{record.guide}</p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center space-x-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{T.duration}</p>
              <p className="text-sm font-bold text-slate-900">{record.duration}h</p>
            </div>
          </div>
        </div>

        {/* Revenue Section */}
        <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <Wallet className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Revenue</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white tracking-tight">
              ¥{record.revenue.toLocaleString()}
            </p>
            {record.currency && record.currency !== 'JPY' && (
              <p className="text-[9px] font-bold text-amber-500/70 uppercase tracking-widest mt-0.5">
                {record.currency} {record.originalAmount?.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordCard;
