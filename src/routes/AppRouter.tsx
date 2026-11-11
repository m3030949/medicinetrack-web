import * as React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import {
  getDefaultHomeForRole,
  useAuth,
} from '@/features/auth/auth-context';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage';
import { ProtectedRoute } from './ProtectedRoute';

const SecuritySettingsPage = React.lazy(() =>
  import('@/features/auth/SecuritySettingsPage').then((m) => ({
    default: m.SecuritySettingsPage,
  })),
);
const SuperAdminDashboardPage = React.lazy(() =>
  import('@/features/super-admin/SuperAdminDashboardPage').then((m) => ({
    default: m.SuperAdminDashboardPage,
  })),
);
const OrganizationsPage = React.lazy(() =>
  import('@/features/super-admin/OrganizationsPage').then((m) => ({
    default: m.OrganizationsPage,
  })),
);
const UsersManagementPage = React.lazy(() =>
  import('@/features/super-admin/UsersManagementPage').then((m) => ({
    default: m.UsersManagementPage,
  })),
);
const AuditLogsPage = React.lazy(() =>
  import('@/features/super-admin/AuditLogsPage').then((m) => ({
    default: m.AuditLogsPage,
  })),
);
const SystemConfigPage = React.lazy(() =>
  import('@/features/super-admin/SystemConfigPage').then((m) => ({
    default: m.SystemConfigPage,
  })),
);
const PharmacyDashboardPage = React.lazy(() =>
  import('@/features/pharmacy/PharmacyDashboardPage').then((m) => ({
    default: m.PharmacyDashboardPage,
  })),
);
const MedicinesPage = React.lazy(() =>
  import('@/features/pharmacy/MedicinesPage').then((m) => ({
    default: m.MedicinesPage,
  })),
);
const BatchesPage = React.lazy(() =>
  import('@/features/pharmacy/BatchesPage').then((m) => ({
    default: m.BatchesPage,
  })),
);
const PackagesQrPage = React.lazy(() =>
  import('@/features/pharmacy/PackagesQrPage').then((m) => ({
    default: m.PackagesQrPage,
  })),
);
const PharmacyShipmentsPage = React.lazy(() =>
  import('@/features/pharmacy/PharmacyShipmentsPage').then((m) => ({
    default: m.PharmacyShipmentsPage,
  })),
);
const PharmacyReportsPage = React.lazy(() =>
  import('@/features/pharmacy/PharmacyReportsPage').then((m) => ({
    default: m.PharmacyReportsPage,
  })),
);
const HospitalDashboardPage = React.lazy(() =>
  import('@/features/hospital/HospitalDashboardPage').then((m) => ({
    default: m.HospitalDashboardPage,
  })),
);
const DepartmentsPage = React.lazy(() =>
  import('@/features/hospital/DepartmentsPage').then((m) => ({
    default: m.DepartmentsPage,
  })),
);
const IncomingShipmentsPage = React.lazy(() =>
  import('@/features/hospital/IncomingShipmentsPage').then((m) => ({
    default: m.IncomingShipmentsPage,
  })),
);
const HospitalInventoryPage = React.lazy(() =>
  import('@/features/hospital/HospitalInventoryPage').then((m) => ({
    default: m.HospitalInventoryPage,
  })),
);
const PatientsPage = React.lazy(() =>
  import('@/features/hospital/PatientsPage').then((m) => ({
    default: m.PatientsPage,
  })),
);
const PrescriptionsPage = React.lazy(() =>
  import('@/features/hospital/PrescriptionsPage').then((m) => ({
    default: m.PrescriptionsPage,
  })),
);
const HospitalReportsPage = React.lazy(() =>
  import('@/features/hospital/HospitalReportsPage').then((m) => ({
    default: m.HospitalReportsPage,
  })),
);
const NurseDashboardPage = React.lazy(() =>
  import('@/features/nurse/NurseDashboardPage').then((m) => ({
    default: m.NurseDashboardPage,
  })),
);
const AdministrationWizardPage = React.lazy(() =>
  import('@/features/nurse/AdministrationWizardPage').then((m) => ({
    default: m.AdministrationWizardPage,
  })),
);
const AdministrationSuccessPage = React.lazy(() =>
  import('@/features/nurse/AdministrationSuccessPage').then((m) => ({
    default: m.AdministrationSuccessPage,
  })),
);
const AdministrationHistoryPage = React.lazy(() =>
  import('@/features/nurse/AdministrationHistoryPage').then((m) => ({
    default: m.AdministrationHistoryPage,
  })),
);
const AdministrationDetailPage = React.lazy(() =>
  import('@/features/nurse/AdministrationDetailPage').then((m) => ({
    default: m.AdministrationDetailPage,
  })),
);

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultHomeForRole(user.role)} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <React.Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
            Loading module...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/security" element={<SecuritySettingsPage />} />

              {/* Super Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route
                  path="/admin/dashboard"
                  element={<SuperAdminDashboardPage />}
                />
                <Route
                  path="/admin/organizations"
                  element={<OrganizationsPage />}
                />
                <Route path="/admin/users" element={<UsersManagementPage />} />
                <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                <Route path="/admin/settings" element={<SystemConfigPage />} />
              </Route>

              {/* Pharmacy Admin Routes */}
              <Route
                element={<ProtectedRoute allowedRoles={['PHARMACY_ADMIN']} />}
              >
                <Route
                  path="/pharmacy/dashboard"
                  element={<PharmacyDashboardPage />}
                />
                <Route path="/pharmacy/medicines" element={<MedicinesPage />} />
                <Route path="/pharmacy/batches" element={<BatchesPage />} />
                <Route path="/pharmacy/packages" element={<PackagesQrPage />} />
                <Route
                  path="/pharmacy/shipments"
                  element={<PharmacyShipmentsPage />}
                />
                <Route
                  path="/pharmacy/reports"
                  element={<PharmacyReportsPage />}
                />
                <Route
                  path="/pharmacy/users"
                  element={<UsersManagementPage />}
                />
                <Route
                  path="/pharmacy/audit-logs"
                  element={<AuditLogsPage />}
                />
              </Route>

              {/* Hospital Admin & Clinician Routes */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={['HOSPITAL_ADMIN', 'CLINICIAN']}
                  />
                }
              >
                <Route
                  path="/hospital/dashboard"
                  element={<HospitalDashboardPage />}
                />
                <Route path="/hospital/patients" element={<PatientsPage />} />
                <Route
                  path="/hospital/prescriptions"
                  element={<PrescriptionsPage />}
                />
                <Route
                  path="/hospital/administrations"
                  element={<AdministrationHistoryPage />}
                />
                <Route
                  path="/hospital/administrations/:id"
                  element={<AdministrationDetailPage />}
                />
              </Route>

              <Route
                element={<ProtectedRoute allowedRoles={['HOSPITAL_ADMIN']} />}
              >
                <Route
                  path="/hospital/departments"
                  element={<DepartmentsPage />}
                />
                <Route
                  path="/hospital/shipments"
                  element={<IncomingShipmentsPage />}
                />
                <Route
                  path="/hospital/inventory"
                  element={<HospitalInventoryPage />}
                />
                <Route
                  path="/hospital/reports"
                  element={<HospitalReportsPage />}
                />
                <Route
                  path="/hospital/staff"
                  element={<UsersManagementPage />}
                />
                <Route
                  path="/hospital/audit-logs"
                  element={<AuditLogsPage />}
                />
              </Route>

              {/* Nurse Routes */}
              <Route element={<ProtectedRoute allowedRoles={['NURSE']} />}>
                <Route
                  path="/nurse/dashboard"
                  element={<NurseDashboardPage />}
                />
                <Route
                  path="/nurse/administer/:sessionId"
                  element={<AdministrationWizardPage />}
                />
                <Route
                  path="/nurse/administer/:sessionId/success"
                  element={<AdministrationSuccessPage />}
                />
                <Route
                  path="/nurse/history"
                  element={<AdministrationHistoryPage />}
                />
                <Route
                  path="/nurse/history/:id"
                  element={<AdministrationDetailPage />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
