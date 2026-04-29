
import React from 'react';
import { TourType, Language } from './types';

export const NARA_COLORS = {
  DEER_BROWN: '#3E2723',
  TORII_RED: '#AF2020',
  FOREST_GREEN: '#1B5E20',
  TEMPLE_GOLD: '#C5A059',
  WASHI_CREAM: '#F9F7F2',
  SUMI_BLACK: '#0A0A0A'
};

export const TOUR_COLORS: Record<TourType, string> = {
  [TourType.GION_KLOOK]: '#AF2020',
  [TourType.GION_VIATOR]: '#D32F2F',
  [TourType.GION_GYG]: '#E53935',
  [TourType.ARASHIYAMA_KLOOK]: '#1B5E20',
  [TourType.ARASHIYAMA_VIATOR]: '#2E7D32',
  [TourType.ARASHIYAMA_GYG]: '#388E3C',
  [TourType.FOOD_TOUR_KYOTO_KLOOK]: '#5D4037',
  [TourType.FOOD_TOUR_KYOTO_VIATOR]: '#795548',
  [TourType.FREE_TOUR]: '#0288D1',
  [TourType.PRIVATE_TOUR]: '#7B1FA2',
};

export const GUIDES = ['Benjamin', 'Momoko', 'Alvaro', 'Yuma'];

export const DEFAULT_CLOUD_URL = 'https://script.google.com/macros/s/AKfycbxkNiMeXzQ8-6RWHJISzZfdEk4VpWSHLtwniXWupo2L4YU3lbHW6gP1vsCs0lhEYxGEbg/exec';

export const CURRENCIES = [
  { code: 'JPY', symbol: '¥', rate: 1 },
  { code: 'USD', symbol: '$', rate: 150 },
  { code: 'EUR', symbol: '€', rate: 160 },
  { code: 'GBP', symbol: '£', rate: 190 },
  { code: 'TWD', symbol: 'NT$', rate: 4.7 },
  { code: 'CNY', symbol: '¥', rate: 21 },
];

export const TRANSLATIONS: Record<Language, any> = {
  ja: {
    title: 'Wonderland',
    subtitle: 'JAPAN',
    upload: '記録入力',
    dashboard: '経営統計',
    history: '履歴管理',
    settings: '設定・同期',
    revenue: '売上金額',
    guests: 'ゲスト数',
    duration: '所要時間',
    type: 'ツアー種類',
    date: '実施日',
    guide: '担当ガイド',
    save: '記録を保存',
    saveRecordBtn: '記録を保存する',
    unlock: '認証する',
    logout: 'ログアウト',
    noRecords: '記録がありません',
    downloadCSV: 'CSV出力',
    deletePasswordPrompt: '削除パスワード（0124）を入力',
    deletePasswordError: 'パスワードエラー',
    saveSuccess: '保存が完了しました',
    revenueError: '金額を入力してください',
    statsTitle: '📊 ツアー統計分析',
    statsRefreshBtn: '統計を更新',
    statsLoading: '統計計算中...',
    statsPlaceholder: 'データを選択してください。',
    statsError: 'エラーが発生しました',
    yearly: '年度売上',
    quarterly: '四半期売上',
    monthly: '月間売上',
    revenueTrend: '収益成長曲線',
    dataSync: 'クラウド同期',
    syncWarning: 'Google Sheets と連携してデータを同期します。',
    syncSuccess: 'クラウドとの同期が完了しました',
    syncError: '同期に失敗しました',
    syncUrlLabel: '同期URL',
    syncNow: '今すぐ同期',
    lastSync: '最終同期',
    autoSync: '自動同期モード',
    autoSyncDesc: '保存時にクラウドへ自動送信します。',
    chartFootnote: '* 2025年9月統計開始',
    monthUnit: '月',
    guestUnit: '名',
    annualSummary: '年度サマリー',
    monthlyPerformance: '月間パフォーマンス',
    growth: '成長率',
    highestRev: '最高売上',
    viewFullYear: '年間統計を表示',
    archives: 'アーカイブ',
    exportCSV: 'CSVを書き出す',
    system: 'システム設定',
    cloudEndpoint: 'クラウドAPIエンドポイント',
    instantUpload: '即時アップロード',
    forceSync: 'クラウド強制同期',
    endSession: 'セッションを終了',
    preLaunchDesc: 'WonderlandJapan は2025年9月より統計を開始しました。',
    months: ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    tours: {
      [TourType.GION_KLOOK]: 'Gion Klook',
      [TourType.GION_VIATOR]: 'Gion Viator',
      [TourType.GION_GYG]: 'Gion GYG',
      [TourType.ARASHIYAMA_KLOOK]: 'Arashiyama Klook',
      [TourType.ARASHIYAMA_VIATOR]: 'Arashiyama Viator',
      [TourType.ARASHIYAMA_GYG]: 'Arashiyama GYG',
      [TourType.FOOD_TOUR_KYOTO_KLOOK]: 'Food Tour Kyoto Klook',
      [TourType.FOOD_TOUR_KYOTO_VIATOR]: 'Food Tour Kyoto Viator',
      [TourType.FREE_TOUR]: 'Free Tour',
      [TourType.PRIVATE_TOUR]: 'Private Tour'
    }
  },
  en: {
    title: 'Wonderland',
    subtitle: 'JAPAN',
    upload: 'Entry',
    dashboard: 'Revenue',
    history: 'History',
    settings: 'Settings',
    revenue: 'Revenue',
    guests: 'Pax',
    duration: 'Duration',
    type: 'Category',
    date: 'Date',
    guide: 'Guide',
    save: 'Save Record',
    saveRecordBtn: 'SAVE RECORD',
    unlock: 'Unlock',
    logout: 'Logout',
    noRecords: 'No Records',
    downloadCSV: 'CSV Export',
    deletePasswordPrompt: 'Enter PIN (0124)',
    deletePasswordError: 'Error',
    saveSuccess: 'Record Saved!',
    revenueError: 'Enter amount',
    statsTitle: '📊 Tour Stats Analysis',
    statsRefreshBtn: 'REFRESH STATISTICS',
    statsLoading: 'CALCULATING...',
    statsPlaceholder: 'Select data to analyze.',
    statsError: 'Error',
    yearly: 'Yearly Rev',
    quarterly: 'Quarterly Rev',
    monthly: 'Monthly Rev',
    revenueTrend: 'Growth Curve',
    dataSync: 'Cloud Sync',
    syncWarning: 'Sync via Google Sheets.',
    syncSuccess: 'Sync Successful',
    syncError: 'Sync Failed',
    syncUrlLabel: 'Sync URL',
    syncNow: 'Sync Now',
    lastSync: 'Last Sync',
    autoSync: 'Auto Sync',
    autoSyncDesc: 'Auto upload on save.',
    chartFootnote: '* Sept 2025 Start',
    monthUnit: 'M',
    guestUnit: 'PAX',
    annualSummary: 'ANNUAL SUMMARY',
    monthlyPerformance: 'MONTH PERFORMANCE',
    growth: 'Growth',
    highestRev: 'HIGHEST REVENUE',
    viewFullYear: 'VIEW FULL YEAR',
    archives: 'Archives',
    exportCSV: 'Export CSV',
    system: 'System',
    cloudEndpoint: 'Cloud API Endpoint',
    instantUpload: 'Instant Upload',
    forceSync: 'FORCE CLOUD SYNC',
    endSession: 'End Session',
    preLaunchDesc: 'Wonderland operation begins Sept 2025.',
    months: ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    tours: {
      [TourType.GION_KLOOK]: 'Gion Klook',
      [TourType.GION_VIATOR]: 'Gion Viator',
      [TourType.GION_GYG]: 'Gion GYG',
      [TourType.ARASHIYAMA_KLOOK]: 'Arashiyama Klook',
      [TourType.ARASHIYAMA_VIATOR]: 'Arashiyama Viator',
      [TourType.ARASHIYAMA_GYG]: 'Arashiyama GYG',
      [TourType.FOOD_TOUR_KYOTO_KLOOK]: 'Food Tour Kyoto Klook',
      [TourType.FOOD_TOUR_KYOTO_VIATOR]: 'Food Tour Kyoto Viator',
      [TourType.FREE_TOUR]: 'Free Tour',
      [TourType.PRIVATE_TOUR]: 'Private Tour'
    }
  }
};

export const WonderlandLogo = ({ className = "w-12 h-12", variant = "light" }) => (
  <div className={`relative flex flex-col items-center justify-center rounded-full overflow-hidden ${className} ${variant === 'red' ? 'bg-[#AF2020]' : ''}`}>
    <div className="relative w-full aspect-square flex items-center justify-center p-[15%]">
      <svg viewBox="0 0 100 100" className={`w-full h-full ${variant === 'red' ? 'text-white' : 'text-current'}`}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {/* Frame */}
        <rect x="34" y="30" width="32" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" />
        {/* Left Door */}
        <rect x="36" y="32" width="14" height="36" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M36 38h14M36 44h14M36 50h14M36 56h14M36 62h14" stroke="currentColor" strokeWidth="0.5" />
        <line x1="43" y1="32" x2="43" y2="68" stroke="currentColor" strokeWidth="0.5" />
        {/* Right Door */}
        <rect x="50" y="32" width="14" height="36" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M50 38h14M50 44h14M50 50h14M50 56h14M50 62h14" stroke="currentColor" strokeWidth="0.5" />
        <line x1="57" y1="32" x2="57" y2="68" stroke="currentColor" strokeWidth="0.5" />
        {/* Door Handles */}
        <circle cx="48.5" cy="50" r="1" fill="currentColor" />
        <circle cx="51.5" cy="50" r="1" fill="currentColor" />
      </svg>
    </div>
  </div>
);

export const TOUR_ICONS: Record<TourType, React.ReactNode> = {
  [TourType.GION_KLOOK]: <WonderlandLogo className="w-6 h-6" />,
  [TourType.GION_VIATOR]: <WonderlandLogo className="w-6 h-6" />,
  [TourType.GION_GYG]: <WonderlandLogo className="w-6 h-6" />,
  [TourType.ARASHIYAMA_KLOOK]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  [TourType.ARASHIYAMA_VIATOR]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  [TourType.ARASHIYAMA_GYG]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  [TourType.FOOD_TOUR_KYOTO_KLOOK]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  [TourType.FOOD_TOUR_KYOTO_VIATOR]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  [TourType.FREE_TOUR]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  [TourType.PRIVATE_TOUR]: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};
