import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Building2,
  Package,
  ShieldCheck,
  Syringe,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';

interface SuperAdminReport {
  generatedAt: string;
  organizationsSummary: Array<{ type: string; status: string; count: number }>;
  usersSummary: Array<{ role: string; status: string; count: number }>;
  batchesSummary: Array<{ status: string; count: number }>;
  packagesSummary: Array<{ status: string; count: number }>;
  shipmentsSummary: Array<{ status: string; count: number }>;
  administrationsSummary: Array<{ status: string; count: number }>;
  auditEventsCount: number;
  organizations: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    _count: {
      users: number;
      medicines: number;
      outgoingShipments: number;
      incomingShipments: number;
      administrations: number;
    };
  }>;
}

function sumCounts(items: Array<{ count: number }>): number {
  return items.reduce((acc, row) => acc + row.count, 0);
}

export function SuperAdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-super-admin'],
    queryFn: async () => {
      const res = await apiClient.get<SuperAdminReport>(
        '/reports/super-admin',
      );
      return res.data;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading platform analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Platform Overview & Organization Analytics
        </h1>
        <p className="text-sm text-slate-500">
          Multi-organization traceability metrics (patient PII excluded from
          platform summaries).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registered Organizations</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Building2 className="h-5 w-5 text-teal-700" />
              {sumCounts(data.organizationsSummary)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 flex flex-wrap gap-1.5">
            {data.organizationsSummary.map((o, i) => (
              <Badge key={i} variant="outline">
                {o.type} ({o.status}): {o.count}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>System Users</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-5 w-5 text-teal-700" />
              {sumCounts(data.usersSummary)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Across Pharmacy, Hospital, Clinical & Platform roles
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tracked Physical Packages</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Package className="h-5 w-5 text-teal-700" />
              {sumCounts(data.packagesSummary)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Dual-QR serialized physical packages
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Administrations & Audits</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Syringe className="h-5 w-5 text-teal-700" />
              {sumCounts(data.administrationsSummary)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
            {data.auditEventsCount} immutable audit events
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-teal-700" />
            Organization-Level Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Catalog / Shipments</TableHead>
                <TableHead>Administrations</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-mono font-semibold">
                    {org.code}
                  </TableCell>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{org.type}</Badge>
                  </TableCell>
                  <TableCell>{org._count.users}</TableCell>
                  <TableCell className="text-xs">
                    {org.type === 'PHARMACY'
                      ? `${org._count.medicines} meds · ${org._count.outgoingShipments} shipments`
                      : `${org._count.incomingShipments} incoming shipments`}
                  </TableCell>
                  <TableCell>{org._count.administrations}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        org.status === 'ACTIVE' ? 'default' : 'destructive'
                      }
                    >
                      {org.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

