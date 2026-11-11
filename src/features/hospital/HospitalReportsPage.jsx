import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  Package,
  ShieldAlert,
  Syringe,
  UserCheck,
} from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';

export const HospitalReportsPage = () => {
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-hospital', dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.get('/reports/hospital', {
        params: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      return res.data;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading hospital reports...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hospital Clinical & Inventory Reports
          </h1>
          <p className="text-sm text-slate-500">
            Hospital-scoped medication consumption, receiving discrepancies, and
            QR mismatch incident monitoring.
          </p>
        </div>

        <div className="flex gap-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600">
              <UserCheck className="h-4 w-4 text-teal-700" />
              Patients & Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.patientsCount}</div>
            <div className="text-xs text-slate-500">
              {data.activePrescriptionsCount} active prescriptions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600">
              <Package className="h-4 w-4 text-teal-700" />
              Inventory Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {data.inventorySummary.map((s) => (
              <Badge key={s.status} variant="outline">
                {s.status}: {s.count}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-600">
              <Syringe className="h-4 w-4 text-teal-700" />
              Administration Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {data.administrationsSummary.map((s) => (
              <Badge key={s.status} variant="secondary">
                {s.status}: {s.count}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700">
              <ShieldAlert className="h-4 w-4" />
              QR Scan Incident Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {data.failedScanIncidentsCount}
            </div>
            <div className="text-xs text-slate-500">
              Blocked mismatches / invalid scans
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertOctagon className="h-4 w-4 text-red-600" />
              Recent Blocked QR Scan Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentFailedScans.length === 0 ? (
              <p className="text-sm text-slate-500">
                No failed or mismatched scan incidents recorded.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Nurse</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentFailedScans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell>
                        <Badge variant="destructive">{scan.scanType}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {scan.failureReason}
                      </TableCell>
                      <TableCell className="text-xs">
                        {scan.session.nurse.fullName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(scan.scannedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Administrations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentAdministrations.map((adm) => (
                  <TableRow key={adm.id}>
                    <TableCell className="font-mono font-semibold">
                      {adm.referenceCode}
                    </TableCell>
                    <TableCell className="text-xs">
                      {adm.patient.patientName} ({adm.patient.patientNumber})
                    </TableCell>
                    <TableCell className="text-xs">
                      {adm.package.medicine.medicineName} (
                      {adm.package.medicine.strength})
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {adm.administrationStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

