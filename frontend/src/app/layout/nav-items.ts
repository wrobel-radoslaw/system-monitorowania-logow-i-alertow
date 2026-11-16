import type { NavIconName } from './NavIcon';

export type NavItem = {
  to: string;
  label: string;
  /** Label under the icon in the mobile bottom bar. */
  shortLabel: string;
  icon: NavIconName;
};

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/logs', label: 'Logs', shortLabel: 'Logs', icon: 'logs' },
  { to: '/alerts', label: 'Alerts', shortLabel: 'Alerts', icon: 'alerts' },
  { to: '/raports', label: 'Reports', shortLabel: 'Reports', icon: 'reports' },
  { to: '/ai', label: 'AI Analysis', shortLabel: 'AI', icon: 'ai' },
];
