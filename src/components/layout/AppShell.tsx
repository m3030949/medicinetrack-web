import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  Clock,
  FileSearch,
  Hospital,
  Layers,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  Pill,
  QrCode,
  Settings,
  ShieldCheck,
  Syringe,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import * as React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/auth';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        { to: '/admin/dashboard', label: 'Overview', icon: Activity },
        { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
        { to: '/admin/users', label: 'System Users', icon: Users },
        { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileSearch },
        { to: '/admin/settings', label: 'System Config', icon: Settings },
        { to: '/security', label: 'Security & MFA', icon: ShieldCheck },
      ];
    case 'PHARMACY_ADMIN':
      return [
        { to: '/pharmacy/dashboard', label: 'Dashboard', icon: Activity },
        { to: '/pharmacy/medicines', label: 'Medicines', icon: Pill },
        { to: '/pharmacy/batches', label: 'Batches & Recalls', icon: Layers },
        { to: '/pharmacy/packages', label: 'Packages & QR Labels', icon: QrCode },
        { to: '/pharmacy/shipments', label: 'Shipments', icon: Truck },
        { to: '/pharmacy/reports', label: 'Reports', icon: BarChart3 },
        { to: '/pharmacy/users', label: 'Pharmacy Staff', icon: Users },
        { to: '/pharmacy/audit-logs', label: 'Audit Logs', icon: FileSearch },
        { to: '/security', label: 'Security & MFA', icon: ShieldCheck },
      ];
    case 'HOSPITAL_ADMIN':
      return [
        { to: '/hospital/dashboard', label: 'Dashboard', icon: Hospital },
        { to: '/hospital/shipments', label: 'Incoming Shipments', icon: PackageCheck },
        { to: '/hospital/inventory', label: 'Inventory', icon: Package },
        { to: '/hospital/patients', label: 'Patients', icon: UserCheck },
        { to: '/hospital/prescriptions', label: 'Prescriptions', icon: ClipboardList },
        { to: '/hospital/administrations', label: 'Administrations', icon: Syringe },
        { to: '/hospital/reports', label: 'Reports', icon: BarChart3 },
        { to: '/hospital/departments', label: 'Departments', icon: Building2 },
        { to: '/hospital/staff', label: 'Nurses & Staff', icon: Users },
        { to: '/hospital/audit-logs', label: 'Audit Logs', icon: FileSearch },
        { to: '/security', label: 'Security & MFA', icon: ShieldCheck },
      ];
    case 'CLINICIAN':
      return [
        { to: '/hospital/dashboard', label: 'Clinical Portal', icon: Hospital },
        { to: '/hospital/patients', label: 'Patients', icon: UserCheck },
        { to: '/hospital/prescriptions', label: 'Prescriptions', icon: ClipboardList },
        { to: '/hospital/administrations', label: 'Administrations', icon: Syringe },
        { to: '/security', label: 'Security & MFA', icon: ShieldCheck },
      ];
    case 'NURSE':
      return [
        { to: '/nurse/dashboard', label: 'Nurse Station', icon: Syringe },
        { to: '/nurse/history', label: 'Administration History', icon: Clock },
        { to: '/security', label: 'Security & MFA', icon: ShieldCheck },
      ];
  }
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (!user) return null;

  const navItems = getNavItems(user.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        <Link to="/" className="flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900">
              MedicineTrack
            </div>
            <div className="text-xs text-slate-500">Clinical Traceability</div>
          </div>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <div className="rounded-lg bg-slate-50 p-3 text-xs">
          <div className="font-semibold text-slate-900">{user.fullName}</div>
          <div className="text-slate-500 truncate">{user.email}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{user.role}</Badge>
            {user.mfaEnabled && <Badge variant="secondary">MFA On</Badge>}
          </div>
          {user.organization && (
            <div className="mt-2 text-slate-600 font-medium">
              {user.organization.name} ({user.organization.code})
            </div>
          )}
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 bg-white shadow-xl">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-slate-600">
              {user.organization ? (
                <span className="font-semibold text-slate-900">
                  {user.organization.name}
                </span>
              ) : (
                <span className="font-semibold text-slate-900">
                  Platform Administration
                </span>
              )}
              {user.department && (
                <span className="ml-2 text-slate-500">
                  · {user.department.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">{user.fullName}</span>
            <Badge variant="outline">{user.role}</Badge>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

