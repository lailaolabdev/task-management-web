import { useState } from 'react';
import pkg from '../../package.json';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('lo') ? 'lo' : 'en';

  const toggle = () => {
    i18n.changeLanguage(current === 'en' ? 'lo' : 'en');
  };

  return (
    <button
      onClick={toggle}
      title="Switch language / ປ່ຽນພາສາ"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-xs font-semibold text-gray-600 hover:text-primary-700 transition-all"
    >
      <span className="text-base leading-none">{current === 'lo' ? '🇱🇦' : '🇬🇧'}</span>
      <span>{current === 'lo' ? 'ລາວ' : 'EN'}</span>
    </button>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const NAV_ITEMS = [
    {
      to: '/dashboard',
      label: t('nav.dashboard'),
      roles: ['Admin', 'Project Manager', 'Lead Team'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      ),
    },
    {
      to: '/kanban',
      label: t('nav.kanbanBoard'),
      roles: ['Admin', 'Developer', 'Project Manager', 'Lead Team', 'Tester', 'UXUI'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
        </svg>
      ),
    },
    {
      to: '/standup',
      label: t('nav.dailyStandup'),
      roles: ['Admin', 'Developer', 'Project Manager', 'Lead Team', 'Tester', 'UXUI'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      to: '/projects',
      label: t('nav.projects'),
      roles: ['Admin', 'Developer', 'Project Manager', 'Lead Team', 'Tester', 'UXUI'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      ),
    },
    {
      to: '/weekly',
      label: t('nav.weeklyReport'),
      roles: ['Admin', 'Developer', 'Project Manager', 'Lead Team', 'Tester', 'UXUI'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      to: '/initiatives',
      label: t('nav.initiatives'),
      roles: ['Admin', 'Developer', 'Project Manager', 'Lead Team', 'Tester', 'UXUI'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
    },
    {
      to: '/teams',
      label: t('nav.teams'),
      roles: ['Admin', 'Project Manager', 'Lead Team'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
    },
    {
      to: '/import',
      label: t('nav.import'),
      roles: ['Admin', 'Project Manager'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      to: '/users',
      label: t('nav.teamMembers'),
      roles: ['Admin', 'Project Manager'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
    },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };
  const visibleNav = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen flex bg-surface-bg">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #ddeef5 0%, #e8f3f7 100%)', borderRight: '1px solid #c8e2ec' }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary-900 leading-none">TaskFlow</h1>
              <p className="text-[10px] text-primary-600/70 font-medium mt-0.5">Lumina Workspace</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/70 border border-primary-200/60 rounded-md pl-8 pr-3 py-2 text-xs text-gray-700 placeholder-primary-400/70 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            />
          </div>
        </div>

        {/* Nav section label */}
        <div className="px-5 mb-1">
          <p className="text-[10px] font-bold text-primary-500/60 uppercase tracking-widest">{t('nav.workspace')}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/projects' ? false : undefined}
              className={({ isActive }) =>
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom — user profile */}
        <div className="p-4 mt-auto">
          <p className="text-center text-[10px] text-primary-400/50 font-medium mb-2 tracking-wide">v{pkg.version}</p>
          <div className="flex items-center gap-3 bg-white/60 border border-primary-200/50 rounded-xl p-3 hover:bg-white/80 transition-colors cursor-default">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success border-2 border-white rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-900 truncate leading-tight">{user?.name}</p>
              <p className="text-[11px] text-primary-600/70 font-medium">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title={t('nav.signOut')}
              className="p-1.5 rounded-md hover:bg-red-50 text-primary-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* Notification bell */}
            <button className="relative p-2 rounded-lg hover:bg-surface-sidebar text-gray-400 hover:text-primary-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning rounded-full border border-white" />
            </button>

            {/* Avatar chip */}
            <div className="flex items-center gap-2 bg-surface-sidebar border border-primary-200/50 rounded-full pl-1 pr-3 py-1">
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success border border-white rounded-full" />
              </div>
              <span className="text-xs font-semibold text-primary-800">{user?.name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
