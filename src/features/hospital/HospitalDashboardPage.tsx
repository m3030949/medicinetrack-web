import { useQuery } from '@tanstack/react-query';
import { Building, Hospital, Users } from 'lucide-react';
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

interface OrgProfile {
  id: string;
  code: string;
  name: string;
  licenseNo: string | null;
  contactEmail: string | null;
  status: string;
  _count: { users: number; medicines: number; patients: number };
}

export function HospitalDashboardPage() {
  const { user } = useAuth();
  const { data: org } = useQuery({
    queryKey: ['my-org-profile'],
    queryFn: async () => {
      const res = await apiClient.get<OrgProfile>('/organizations/me/profile');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {org?.name ?? user?.organization?.name ?? 'Hospital Workspace'}
          </h1>
          <p className="text-sm text-slate-500">
            Hospital Code: <span className="font-mono">{org?.code}</span> ·
            Strict Tenant Isolation Enabled
          </p>
        </div>
        <Badge>{org?.status ?? 'ACTIVE'}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Authorized Staff</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-5 w-5 text-teal-700" />
              {org?._count.users ?? '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" asChild>
              <Link to="/hospital/staff">Manage Nurses & Staff</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registered Hospital Patients</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Hospital className="h-5 w-5 text-teal-700" />
              {org?._count.patients ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/hospital/patients">Patient Registry</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/hospital/prescriptions">Prescriptions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hospital Supply Chain</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Building className="h-5 w-5 text-teal-700" />
              Receiving & Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/hospital/shipments">Incoming Shipments</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/hospital/inventory">Inventory</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/hospital/departments">Departments</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/hospital/reports">Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

