import React from 'react';
import { TourType, Language } from './types';

export const NARA_COLORS = {
  DEER_BROWN: '#5D4037',
  TORII_RED: '#AF2020',
  FOREST_GREEN: '#1B5E20',
  TEMPLE_GOLD: '#C5A059',
  WASHI_CREAM: '#FDFCF0',
  SUMI_BLACK: '#1A1A1A'
};

export const TOUR_COLORS: Record<TourType, string> = {
  [TourType.GION_WALK]: '#AF2020', 
  [TourType.ARASHIYAMA_WALK]: '#1B5E20',
  [TourType.KYOTO_FOOD]: '#5D4037',
  [TourType.OSAKA_FOOD]: '#1976D2',
  [TourType.FREE_TOUR]: '#006064',
};

export const GUIDES = ['Alvaro', 'Benjamin', 'Momoko', 'Nana', 'Honoka', 'Kaho'];

export const TRANSLATIONS: Record<Language, any> = {
  ja: {
    title: 'Wonderland',
    subtitle: 'JAPAN',
    upload: '記録入力',
    dashboard: '売上レポート',
    history: '履歴管理',
    revenue: '売上金額',
    guests: 'ゲスト数',
    duration: '所要時間',
    type: 'ツアー種類',
    date: '実施日',
    guide: '担当ガイド',
    save: '記録を保存',
    adminLogin: '管理者認証',
    adminSuccess: '認証に成功しました',
    adminHint: 'パスワードを入力してください',
    adminPass: 'Passcode',
    unlock: '認証する',
    logout: '管理者モードを終了',
    noRecords: '記録がありません',
    exportReport: 'レポートを送信',
    deleteConfirm: 'この記録を削除しますか？',
    saveSuccess: '記録を保存しました',
    revenueError: '金額を入力してください',
    aiInsights: '✦ AI インサイト',
    aiAnalyzeBtn: '経営分析レポートを生成',
    aiAnalyzing: '分析中...',
    aiPlaceholder: '下のボタンをクリックすると、AIが経営状況を分析します。',
    aiError: 'AI分析は現在利用できません。',
    emailSubject: 'WonderlandJapan 売上レポート',
    emailHeader: 'WonderlandJapan 運営レポート',
    emailTotalRev: '総売上',
    emailTotalGuests: '総ゲスト数',
    emailTotalHours: '総時間',
    emailDetail: '--- 詳細記録 ---',
    tours: {
      [TourType.GION_WALK]: '祇園ウォーキング',
      [TourType.ARASHIYAMA_WALK]: '嵐山ウォーキング',
      [TourType.KYOTO_FOOD]: '京都フードツアー',
      [TourType.OSAKA_FOOD]: '大阪フードツアー',
      [TourType.FREE_TOUR]: '無料ツアー'
    }
  },
  en: {
    title: 'Wonderland',
    subtitle: 'JAPAN',
    upload: 'Record Entry',
    dashboard: 'Revenue Hub',
    history: 'Archives',
    revenue: 'Revenue',
    guests: 'Pax Count',
    duration: 'Duration',
    type: 'Category',
    date: 'Date',
    guide: 'Guide',
    save: 'Commit Record',
    adminLogin: 'Manager Access',
    adminSuccess: 'Authenticated',
    adminHint: 'Enter passcode',
    adminPass: 'Passcode',
    unlock: 'Authenticate',
    logout: 'Exit Admin Mode',
    noRecords: 'No Records',
    exportReport: 'Export Report',
    deleteConfirm: 'Delete this record?',
    saveSuccess: 'Record saved!',
    revenueError: 'Please enter amount',
    aiInsights: '✦ AI Insights',
    aiAnalyzeBtn: 'Generate Business Report',
    aiAnalyzing: 'Analyzing...',
    aiPlaceholder: 'Click the button below to analyze your business with AI.',
    aiError: 'AI analysis is currently unavailable.',
    emailSubject: 'WonderlandJapan Revenue Report',
    emailHeader: 'WonderlandJapan Operation Report',
    emailTotalRev: 'Total Revenue',
    emailTotalGuests: 'Total Guests',
    emailTotalHours: 'Total Hours',
    emailDetail: '--- Detailed Records ---',
    tours: {
      [TourType.GION_WALK]: 'Gion Walk',
      [TourType.ARASHIYAMA_WALK]: 'Arashiyama Walk',
      [TourType.KYOTO_FOOD]: 'Kyoto Food Tour',
      [TourType.OSAKA_FOOD]: 'Osaka Food Tour',
      [TourType.FREE_TOUR]: 'Free Tour'
    }
  }
};

export const WonderlandLogo = ({ className = "w-12 h-12" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="35" y="30" width="30" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="37" y="32" width="13" height="36" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M37 38h13M37 44h13M37 50h13M37 56h13M37 62h13" stroke="currentColor" strokeWidth="0.8" />
      <line x1="43.5" y1="32" x2="43.5" y2="68" stroke="currentColor" strokeWidth="0.8" />
      <rect x="50" y="32" width="13" height="36" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M50 38h13M50 44h13M50 50h13M50 56h13M50 62h13" stroke="currentColor" strokeWidth="0.8" />
      <line x1="56.5" y1="32" x2="56.5" y2="68" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="48" cy="50" r="1.5" fill="currentColor" />
      <circle cx="52" cy="50" r="1.5" fill="currentColor" />
    </svg>
  </div>
);

export const TOUR_ICONS: Record<TourType, React.ReactNode> = {
  [TourType.GION_WALK]: <WonderlandLogo className="w-6 h-6" />,
  [TourType.ARASHIYAMA_WALK]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  [TourType.KYOTO_FOOD]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  [TourType.OSAKA_FOOD]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  [TourType.FREE_TOUR]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};