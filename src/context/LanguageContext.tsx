'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'fa';

const dictionary = {
  en: {
    // Navigation & Sidebar
    home: 'Home',
    browse: 'Browse All Music',
    albums: '💿 Albums Archive',
    singles: '🎵 Singles Archive',
    playlists: 'My Playlists',
    profile: 'My Profile',
    tickets: '🎧 Support Tickets',
    notifications: 'Notifications',
    settings: 'Settings',
    logout: 'Log Out of Account',
    artistStudio: 'Artist Studio',
    adminDashboard: 'Admin Dashboard',
    
    // Player & Queue
    shuffle: 'SHUFFLE',
    rep: 'REP',
    lyrics: 'Lyrics',
    vol: 'Vol',
    queue: '📑 Queue',
    upNext: 'Up Next in Queue',
    emptyQueue: 'Your queue is currently empty.',
    closeLyrics: 'Close Lyrics',
    play: 'Play',
    
    // Home Page
    welcomeBack: 'Welcome back',
    discoverText: 'Discover top trending albums and tracks on the platform.',
    recentPlaylists: '🎧 Recently Played Playlists',
    tracksCount: 'tracks',
    vipExclusive: '⭐ VIP Gold Exclusive: Early Access Releases',
    playVip: 'Play VIP',
    popularReleases: 'Popular Releases',
    playTrack: 'Play Track',
    featuredAlbums: 'Featured Albums (Click to View Tracklist)',

    // Browse Page
    searchPlaceholder: 'Search by song title or artist name...',
    sortBy: 'Sort By:',
    mostListeners: 'Most Listeners',
    releaseDate: 'Release Date',
    streams: 'streams',
    unique: 'unique',
    unlockVip: '🔒 Unlock VIP',

    // Albums & Singles Archives
    albumsArchiveTitle: 'Albums Archive',
    albumsArchiveDesc: 'Explore full discography releases from verified platform artists.',
    singlesArchiveTitle: 'Singles Archive',
    singlesArchiveDesc: 'Stream standalone single tracks released directly by artists.',
    playSingle: 'Play Single',

    // Playlists Page
    playlistsTitle: 'My Playlists',
    currentTierLabel: 'Current Tier:',
    newPlaylistPlaceholder: 'New playlist name...',
    createBtn: 'Create',
    noPlaylists: 'No playlists found. Create your first playlist above!',
    renameBtn: '✏️ Rename',
    deleteBtn: '🗑️ Delete',
    noSongsInList: 'No songs in this list yet.',
    addSongsFromArchive: '➕ Add Songs from Archive',

    // Notifications Page
    sysNotificationsTitle: 'System Notifications',
    markAllRead: 'Mark All as Read',
    noNotifs: 'No system notifications.',
    markReadBtn: '✓ Mark Read',
    deleteNotifBtn: 'Delete',
    viewDetails: 'View Details ➡️',

    // Support Tickets Page
    supportTicketsTitle: 'Submit New Support Ticket',
    supportTicketsDesc: 'Report playback errors, verification inquiries, or billing questions.',
    issueSubject: 'Issue Subject',
    issueSubjectPlaceholder: 'e.g., Audio buffering error...',
    msgDesc: 'Message Description',
    msgDescPlaceholder: 'Describe your issue in detail...',
    submitTicketBtn: 'Submit Ticket',
    myTicketHistory: 'My Ticket History',
    noTickets: 'No support tickets created yet.',
    sentAt: 'Sent:',

    // Settings Page
    subManagement: 'Subscription Tier Management',
    currentTier: 'Current Active Tier',
    silverPlan: 'Silver Plan',
    goldPlan: 'VIP Gold Plan',
    selectSilver: 'Select Silver',
    upgradeGold: 'Upgrade Gold',
    preferences: 'Platform & Audio Preferences',
    sysVolume: 'Default System Sound Volume',
    volDesc: 'Sets the baseline volume across all streaming media and players.',
    notifLimits: 'Notification Limitations',
    notifReleases: 'Receive alerts for new track releases from followed artists',
    notifExpire: 'Receive subscription expiration & renewal warnings',
    notifEmail: 'Send system notifications directly to my registered email',
    interfaceLang: 'Interface Language',
    savePrefs: 'Save All Preferences',
  },
  fa: {
    // Navigation & Sidebar
    home: 'خانه',
    browse: 'جستجوی موسیقی',
    albums: '💿 آرشیو آلبوم‌ها',
    singles: '🎵 آرشیو تک‌آهنگ‌ها',
    playlists: 'پلی‌لیست‌های من',
    profile: 'نمایه کاربری',
    tickets: '🎧 تیکت‌های پشتیبانی',
    notifications: 'اعلانات',
    settings: 'تنظیمات برنامه',
    logout: 'خروج از حساب کاربری',
    artistStudio: 'پنل هنرمندان',
    adminDashboard: 'داشبورد مدیریت',
    
    // Player & Queue
    shuffle: 'تصادفی',
    rep: 'تکرار',
    lyrics: 'متن آهنگ',
    vol: 'صدا',
    queue: '📑 صف پخش',
    upNext: 'آهنگ‌های بعدی در صف',
    emptyQueue: 'صف پخش شما در حال حاضر خالی است.',
    closeLyrics: 'بستن متن آهنگ',
    play: 'پخش',
    
    // Home Page
    welcomeBack: 'خوش آمدید',
    discoverText: 'جدیدترین و محبوب‌ترین آثار موسیقی را در سامانه کشف کنید.',
    recentPlaylists: '🎧 آخرین پلی‌لیست‌های شنیده‌شده',
    tracksCount: 'آهنگ',
    vipExclusive: '⭐ دسترسی زودهنگام ویژه مشترکین طلایی',
    playVip: 'پخش ویژه',
    popularReleases: 'آثار پرشنونده',
    playTrack: 'پخش آهنگ',
    featuredAlbums: 'آلبوم‌های برگزیده (برای مشاهده لیست آهنگ‌ها کلیک کنید)',

    // Browse Page
    searchPlaceholder: 'جستجو بر اساس نام اثر یا هنرمند...',
    sortBy: 'مرتب‌سازی بر اساس:',
    mostListeners: 'بیشترین شنونده',
    releaseDate: 'تاریخ انتشار',
    streams: 'استریم',
    unique: 'شنونده یکتا',
    unlockVip: '🔒 ارتقا به طلایی',

    // Albums & Singles Archives
    albumsArchiveTitle: 'آرشیو آلبوم‌ها',
    albumsArchiveDesc: 'آثار و آلبوم‌های منتشرشده از هنرمندان تاییدشده سامانه را کاوش کنید.',
    singlesArchiveTitle: 'آرشیو تک‌آهنگ‌ها',
    singlesArchiveDesc: 'تک‌آهنگ‌های منتشرشده توسط هنرمندان را گوش دهید.',
    playSingle: 'پخش تک‌آهنگ',

    // Playlists Page
    playlistsTitle: 'پلی‌لیست‌های من',
    currentTierLabel: 'سطح اشتراک:',
    newPlaylistPlaceholder: 'نام پلی‌لیست جدید...',
    createBtn: 'ایجاد',
    noPlaylists: 'هیچ پلی‌لیستی یافت نشد. اولین پلی‌لیست خود را در بالا بسازید!',
    renameBtn: '✏️ تغییر نام',
    deleteBtn: '🗑️ حذف',
    noSongsInList: 'هنوز آهنگی به این لیست اضافه نشده است.',
    addSongsFromArchive: '➕ افزودن آهنگ از آرشیو',

    // Notifications Page
    sysNotificationsTitle: 'اعلانات سیستمی',
    markAllRead: 'علامت‌گذاری همه به عنوان خوانده‌شده',
    noNotifs: 'هیچ اعلان سیستمی وجود ندارد.',
    markReadBtn: '✓ خوانده‌شد',
    deleteNotifBtn: 'حذف',
    viewDetails: 'مشاهده جزئیات ⬅️',

    // Support Tickets Page
    supportTicketsTitle: 'ثبت تیکت پشتیبانی جدید',
    supportTicketsDesc: 'گزارش خطاهای پخش، سوالات احراز هویت یا امور مالی.',
    issueSubject: 'موضوع تیکت',
    issueSubjectPlaceholder: 'مثلا: مشکل در پخش آهنگ...',
    msgDesc: 'متن پیام',
    msgDescPlaceholder: 'مشکل خود را با جزئیات شرح دهید...',
    submitTicketBtn: 'ارسال تیکت',
    myTicketHistory: 'تاریخچه تیکت‌های من',
    noTickets: 'هنوز تیکتی ثبت نکرده‌اید.',
    sentAt: 'ارسال:',

    // Settings Page
    subManagement: 'مدیریت اشتراک و سطح دسترسی',
    currentTier: 'سطح اشتراک فعال شما',
    silverPlan: 'اشتراک نقره‌ای',
    goldPlan: 'اشتراک ویژه طلایی',
    selectSilver: 'انتخاب نقره‌ای',
    upgradeGold: 'ارتقا به طلایی',
    preferences: 'تنظیمات پلتفرم و پخش صدا',
    sysVolume: 'میزان صدای پیش‌فرض سامانه',
    volDesc: 'میزان صدای اولیه را برای تمامی پخش‌کننده‌ها و آهنگ‌ها تنظیم می‌کند.',
    notifLimits: 'محدودیت و مدیریت اعلانات',
    notifReleases: 'دریافت هشدار انتشار آثار جدید از هنرمندان دنبال‌شده',
    notifExpire: 'دریافت هشدار اتمام مهلت و تمدید اشتراک',
    notifEmail: 'ارسال اعلانات سیستمی به ایمیل ثبت‌شده من',
    interfaceLang: 'زبان رابط کاربری',
    savePrefs: 'ذخیره تمامی تنظیمات',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof dictionary.en;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Language;
    if (saved === 'fa' || saved === 'en') {
      setLanguageState(saved);
      document.documentElement.dir = saved === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = saved;
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t: dictionary[language],
      isRtl: language === 'fa'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
};