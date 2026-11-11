import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Layers, Plus, QrCode } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
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
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient, extractApiError } from '@/lib/api-client';

type BatchStatus = 'ACTIVE' | 'EXPIRED' | 'RECALLED' | 'QUARANTINED';

interface MedicineOption {
  id: string;
  medicineCode: string;
  medicineName: string;
  strength: string;
}

interface BatchRow {
  id: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
  status: BatchStatus;
  statusReason: string | null;
  medicine: MedicineOption;
  _count: { packages: number };
}

const batchSchema = z.object({
  medicineId: z.string().uuid('Select a medicine'),
  batchNumber: z.string().min(2).max(100),
  manufacturingDate: z.string().min(10),
  expiryDate: z.string().min(10),
  quantity: z.coerce.number().int().min(1),
});

type BatchValues = z.infer<typeof batchSchema>;

function badgeForStatus(status: BatchStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'RECALLED':
    case 'EXPIRED':
      return 'destructive';
    case 'QUARANTINED':
      return 'warning';
  }
}

export function BatchesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [statusTarget, setStatusTarget] = React.useState<BatchRow | null>(null);
  const [nextStatus, setNextStatus] = React.useState<BatchStatus>('RECALLED');
  const [statusReason, setStatusReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const { data: batchesData, isLoading } = useQuery({
    queryKey: ['pharmacy-batches'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: BatchRow[] }>(
        '/pharmacy/batches',
        { params: { limit: 100 } },
      );
      return res.data.items;
    },
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ['pharmacy-medicines-options'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: MedicineOption[] }>(
        '/pharmacy/medicines',
        { params: { limit: 100 } },
      );
      return res.data.items;
    },
  });

  const form = useForm<BatchValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      medicineId: '',
      batchNumber: '',
      manufacturingDate: new Date().toISOString().slice(0, 10),
      expiryDate: '',
      quantity: 50,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: BatchValues) =>
      apiClient.post('/pharmacy/batches', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-batches'] });
      setCreateOpen(false);
      setError(null);
      form.reset();
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/pharmacy/batches/${statusTarget!.id}/status`, {
        status: nextStatus,
        statusReason,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-batches'] });
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-packages'] });
      setStatusTarget(null);
      setStatusReason('');
      setError(null);
    },
    onError: (err) => setError(extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Medicine Batches & Recall Controls
          </h1>
          <p className="text-sm text-slate-500">
            Track manufacturing lots, expiry dates, and immediate batch-level
            recalls.
          </p>
        </div>

        <Button
          onClick={() => {
            setError(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Register Batch
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Medicine Batch</DialogTitle>
            <DialogDescription>
              Package generation capacity is strictly bounded by batch quantity.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="mb-3">
              {error}
            </Alert>
          )}

          <form
            onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="medicineId">Medicine</Label>
              <Select id="medicineId" {...form.register('medicineId')}>
                <option value="">Select medicine...</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.medicineName} ({m.strength}) — {m.medicineCode}
                  </option>
                ))}
              </Select>
              {form.formState.errors.medicineId && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.medicineId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input
                  id="batchNumber"
                  placeholder="BATCH-2026-001"
                  {...form.register('batchNumber')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Batch Quantity (Units)</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  {...form.register('quantity')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
                <Input
                  id="manufacturingDate"
                  type="date"
                  {...form.register('manufacturingDate')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  {...form.register('expiryDate')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create Batch
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Update Batch Status: {statusTarget?.batchNumber}
            </DialogTitle>
            <DialogDescription>
              Marking a batch RECALLED, QUARANTINED, or EXPIRED immediately
              blocks all unadministered packages across hospitals.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nextStatus">New Batch Status</Label>
              <Select
                id="nextStatus"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as BatchStatus)}
              >
                <option value="RECALLED">RECALLED</option>
                <option value="QUARANTINED">QUARANTINED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="ACTIVE">ACTIVE</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="statusReason">Audit Reason</Label>
              <Input
                id="statusReason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Manufacturer recall notice / cold chain excursion"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStatusTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate()}
              >
                Apply Status Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-teal-700" />
            Registered Batches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading batches...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Mfg / Expiry</TableHead>
                  <TableHead>Packages Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(batchesData ?? []).map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono font-semibold">
                      {batch.batchNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {batch.medicine.medicineName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {batch.medicine.strength}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>Mfg: {batch.manufacturingDate.slice(0, 10)}</div>
                      <div className="font-medium text-slate-800">
                        Exp: {batch.expiryDate.slice(0, 10)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {batch._count.packages} / {batch.quantity}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeForStatus(batch.status)}>
                        {batch.status}
                      </Badge>
                      {batch.statusReason && (
                        <div className="text-xs text-slate-500 mt-1 max-w-44 truncate">
                          {batch.statusReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {batch.status === 'ACTIVE' && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/pharmacy/packages?batchId=${batch.id}`}>
                            <QrCode className="h-3.5 w-3.5" />
                            Generate QRs
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setError(null);
                          setStatusTarget(batch);
                          setNextStatus('RECALLED');
                          setStatusReason(batch.statusReason ?? '');
                        }}
                      >
                        Status
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

