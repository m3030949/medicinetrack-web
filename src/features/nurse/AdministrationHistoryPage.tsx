import { useQuery } from '@tanstack/react-query';
import { Clock, Eye } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/features/auth/auth-context';
import { apiClient } from '@/lib/api-client';

interface AdministrationListItem {
  id: string;
  referenceCode: string;
  administrationStatus: string;
  administeredAt: string | null;
  createdAt: string;
  patient: { patientNumber: string; patientName: string };
  nurse: { fullName: string; employeeCode: string | null };
  package: {
    packageSerial: string;
    medicine: { medicineName: string; strength: string };
    batch: { batchNumber: string };
  };
}

export function AdministrationHistoryPage() {
  const { user } = useAuth();
  const [patientNumber, setPatientNumber] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['administrations-history', patientNumber, status, dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.get<{ items: AdministrationListItem[] }>(
        '/administrations',
        {
          params: {
            patientNumber: patientNumber || undefined,
            status: status || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            limit: 100,
          },
        },
      );
      return res.data.items;
    },
  });

  const detailPrefix =
    user?.role === 'NURSE' ? '/nurse/history' : '/hospital/administrations';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Injection Administration History
        </h1>
        <p className="text-sm text-slate-500">
          Hospital-isolated clinical administration records. Completed records
          are immutable for nurses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-teal-700" />
            Filter Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Input
              placeholder="Filter Patient ID..."
              value={patientNumber}
              onChange={(e) => setPatientNumber(e.target.value)}
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ADMINISTERED">ADMINISTERED</option>
              <option value="PARTIALLY_ADMINISTERED">
                PARTIALLY_ADMINISTERED
              </option>
              <option value="NOT_ADMINISTERED">NOT_ADMINISTERED</option>
            </Select>
            <Input
              type="date"
              aria-label="Date From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              aria-label="Date To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">
              Loading administration records...
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Patient ID / Name</TableHead>
                  <TableHead>Medicine & Batch</TableHead>
                  <TableHead>Nurse</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono font-semibold">
                      {row.referenceCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs font-semibold">
                        {row.patient.patientNumber}
                      </div>
                      <div className="text-sm">{row.patient.patientName}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">
                        {row.package.medicine.medicineName} (
                        {row.package.medicine.strength})
                      </div>
                      <div className="font-mono text-slate-500">
                        {row.package.batch.batchNumber} ·{' '}
                        {row.package.packageSerial}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.nurse.fullName}
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
                            : row.administrationStatus === 'NOT_ADMINISTERED'
                              ? 'destructive'
                              : 'warning'
                        }
                      >
                        {row.administrationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`${detailPrefix}/${row.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          View
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

