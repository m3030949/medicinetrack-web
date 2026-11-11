import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, QrCode, Truck } from 'lucide-react';
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

export const PharmacyReportsPage = () => {
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-pharmacy', dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.get('/reports/pharmacy', {
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
        Loading pharmacy reports...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pharmacy Operations & Traceability Reports
          </h1>
          <p className="text-sm text-slate-500">
            Catalog inventory, dual-QR lifecycle activity, expiry alerts, and
            hospital dispatch metrics.
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-teal-700" />
              Package Lifecycle Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.packagesSummary.map((row) => (
              <Badge key={row.status} variant="outline">
                {row.status}: {row.count}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-4 w-4 text-teal-700" />
              QR Audit Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.qrActivitySummary.map((row) => (
              <Badge key={row.action} variant="secondary">
                {row.action}: {row.count}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-teal-700" />
              Shipments by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.shipmentsSummary.map((row) => (
              <Badge key={row.status} variant="outline">
                {row.status}: {row.count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Expiring Active Batches (Next 60 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.expiringBatches.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active batches expiring within 60 days.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Packages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.expiringBatches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-semibold">
                        {b.batchNumber}
                      </TableCell>
                      <TableCell>
                        {b.medicine.medicineName} ({b.medicine.strength})
                      </TableCell>
                      <TableCell className="text-red-700 font-medium">
                        {b.expiryDate.slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        {b._count.packages}/{b.quantity}
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
            <CardTitle className="text-base">
              Recent Hospital Dispatches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentShipments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold">
                      {s.shipmentReference}
                    </TableCell>
                    <TableCell>
                      {s.hospital.name} ({s.hospital.code})
                    </TableCell>
                    <TableCell>{s._count.items}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.status}</Badge>
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

