import { useQuery } from '@tanstack/react-query';
import { History, Package, Search } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { apiClient } from '@/lib/api-client';

export const HospitalInventoryPage = () => {
  const [statusFilter, setStatusFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [custodyPkgId, setCustodyPkgId] = React.useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hospital-inventory', statusFilter, search],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/hospital', {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
          limit: 100,
        },
      });
      return res.data;
    },
  });

  const { data: custody } = useQuery({
    queryKey: ['package-custody', custodyPkgId],
    enabled: Boolean(custodyPkgId),
    queryFn: async () => {
      const res = await apiClient.get(
        `/inventory/packages/${custodyPkgId}/custody`,
      );
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hospital Medicine Inventory
        </h1>
        <p className="text-sm text-slate-500">
          Packages explicitly verified and accepted into your hospital stock.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(data?.summary ?? []).map((item) => (
          <Badge key={item.status} variant="outline" className="px-3 py-1">
            {item.status}: {item.count}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-teal-700" />
            Stocked Packages
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            <Select
              className="w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="ADMINISTERED">ADMINISTERED</option>
              <option value="DAMAGED">DAMAGED</option>
              <option value="RECALLED">RECALLED</option>
            </Select>
            <div className="relative w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search PKG- or medicine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading inventory...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch & Expiry</TableHead>
                  <TableHead>Outside QR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Custody</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((pkg) => {
                  const outer = pkg.qrCodes.find((q) => q.qrType === 'OUTER');
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-mono font-semibold">
                        {pkg.packageSerial}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {pkg.medicine.medicineName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {pkg.medicine.strength} · {pkg.medicine.dosageForm}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono">{pkg.batch.batchNumber}</div>
                        <div>Exp: {pkg.batch.expiryDate.slice(0, 10)}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {outer?.displayCode ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pkg.status === 'AVAILABLE'
                              ? 'default'
                              : pkg.status === 'RECALLED' ||
                                  pkg.status === 'DAMAGED'
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {pkg.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCustodyPkgId(pkg.id)}
                        >
                          <History className="h-3.5 w-3.5" />
                          Trace
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(custodyPkgId)}
        onOpenChange={(open) => !open && setCustodyPkgId(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Chain of Custody — {custody?.packageSerial}
            </DialogTitle>
            <DialogDescription>
              Origin: {custody?.pharmacy.name} · Current Status:{' '}
              {custody?.status}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(custody?.custodyEvents ?? []).map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {evt.eventType}
                  </div>
                  <div className="text-slate-500">
                    By {evt.actor.fullName} ({evt.actor.role})
                  </div>
                </div>
                <div className="text-slate-500">
                  {new Date(evt.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

