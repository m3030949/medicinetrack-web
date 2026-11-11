import { useQuery } from '@tanstack/react-query';
import { PackageCheck, Pill, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { apiClient } from '@/lib/api-client';

export const PharmacyDashboardPage = () => {
  const { user } = useAuth();
  const { data: org } = useQuery({
    queryKey: ['my-org-profile'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations/me/profile');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {org?.name ?? user?.organization?.name ?? 'Pharmacy Workspace'}
          </h1>
          <p className="text-sm text-slate-500">
            Pharmacy Code: <span className="font-mono">{org?.code}</span> ·
            License: {org?.licenseNo ?? 'Pending'}
          </p>
        </div>
        <Badge>{org?.status ?? 'ACTIVE'}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pharmacy Administrators</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-5 w-5 text-teal-700" />
              {org?._count.users ?? '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" asChild>
              <Link to="/pharmacy/users">Manage Staff</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Catalog Medicines</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Pill className="h-5 w-5 text-teal-700" />
              {org?._count.medicines ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/pharmacy/medicines">Catalog</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/pharmacy/batches">Batches</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/pharmacy/packages">Dual-QR Labels</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Distribution & Custody</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <PackageCheck className="h-5 w-5 text-teal-700" />
              Shipments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/pharmacy/shipments">Manage Dispatches</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/pharmacy/reports">View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

