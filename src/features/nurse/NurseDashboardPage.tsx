import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
  Clock,
  Eye,
  Syringe,
} from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/features/auth/auth-context';
import { apiClient, extractApiError } from '@/lib/api-client';

interface HistoryItem {
  id: string;
  referenceCode: string;
  administrationStatus: string;
  administeredAt: string | null;
  createdAt: string;
  patient: { patientNumber: string; patientName: string };
  package: {
    medicine: { medicineName: string; strength: string };
    batch: { batchNumber: string };
  };
}

export function NurseDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startError, setStartError] = React.useState<string | null>(null);

  const { data: recent = [] } = useQuery({
    queryKey: ['nurse-recent-administrations'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: HistoryItem[] }>(
        '/administrations',
        { params: { limit: 5 } },
      );
      return res.data.items;
    },
  });

  const startMutation = useMutation({
    mutationFn: () => apiClient.post<{ id: string }>('/administrations/start', {}),
    onSuccess: (res) => {
      navigate(`/nurse/administer/${res.data.id}`);
    },
    onError: (err) => setStartError(extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <Building2 className="h-4 w-4" />
              Assigned Hospital Context
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user?.organization?.name ?? 'Unassigned Hospital'}
            </h1>
            <p className="text-sm text-slate-600">
              Nurse: <span className="font-semibold">{user?.fullName}</span>
              {user?.department ? ` · ${user.department.name}` : ''}
            </p>
          </div>

          <Button
            size="lg"
            className="gap-2 shadow-sm"
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            <Syringe className="h-5 w-5" />
            {startMutation.isPending
              ? 'Starting Session...'
              : 'New Administration'}
          </Button>
        </div>
      </div>

      {startError && <Alert variant="destructive">{startError}</Alert>}

      <Alert variant="default" className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <div className="font-semibold text-slate-900">
            Dual-QR Sequential Safety Enforcement
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Hospital context is locked to your credential. Both outside box QR
            and inside vial QR must match the same physical package, alongside
            patient identity and controlled prescription verification.
          </p>
        </div>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-teal-700" />
              Recent Administration History
            </CardTitle>
            <CardDescription>
              Read-only hospital administration audit log.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/nurse/history">View Full History</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">
              No administration records recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medicine / Batch</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono font-semibold">
                      {row.referenceCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {row.patient.patientName}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {row.patient.patientNumber}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">
                        {row.package.medicine.medicineName} (
                        {row.package.medicine.strength})
                      </div>
                      <div className="font-mono text-slate-500">
                        {row.package.batch.batchNumber}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(
                        row.administeredAt ?? row.createdAt,
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.administrationStatus === 'ADMINISTERED'
                            ? 'default'
                            : 'warning'
                        }
                      >
                        {row.administrationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/nurse/history/${row.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
