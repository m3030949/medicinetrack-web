import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus, Send, Truck, XCircle } from 'lucide-react';
import * as React from 'react';
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

export const PharmacyShipmentsPage = () => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState(null);
  const [hospitalId, setHospitalId] = React.useState('');
  const [selectedPkgIds, setSelectedPkgIds] = React.useState([]);
  const [notes, setNotes] = React.useState('');
  const [feedback, setFeedback] = React.useState(null);
  const [error, setError] = React.useState(null);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['pharmacy-shipments'],
    queryFn: async () => {
      const res = await apiClient.get('/shipments', {
        params: { limit: 50 },
      });
      return res.data.items;
    },
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['destination-hospitals'],
    enabled: createOpen,
    queryFn: async () => {
      const res = await apiClient.get('/shipments/destination-hospitals');
      return res.data;
    },
  });

  const { data: availablePackages = [] } = useQuery({
    queryKey: ['pharmacy-available-packages'],
    enabled: createOpen,
    queryFn: async () => {
      const res = await apiClient.get('/inventory/pharmacy', {
        params: { status: 'CREATED', limit: 100 },
      });
      return res.data.items;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['shipment-detail', detailId],
    enabled: Boolean(detailId),
    queryFn: async () => {
      const res = await apiClient.get(`/shipments/${detailId}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/shipments', {
        hospitalId,
        packageIds: selectedPkgIds,
        notes: notes || undefined,
      }),
    onSuccess: (res) => {
      setCreateOpen(false);
      setHospitalId('');
      setSelectedPkgIds([]);
      setNotes('');
      setError(null);
      setFeedback(`Shipment ${res.data.shipmentReference} created as DRAFT.`);
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-shipments'] });
      void queryClient.invalidateQueries({
        queryKey: ['pharmacy-available-packages'],
      });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const dispatchMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/shipments/${id}/dispatch`),
    onSuccess: () => {
      setError(null);
      setFeedback('Shipment dispatched to hospital.');
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-shipments'] });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) =>
      apiClient.post(`/shipments/${id}/cancel`, {
        reason: 'Cancelled by pharmacy prior to hospital receipt',
      }),
    onSuccess: () => {
      setError(null);
      setFeedback('Shipment cancelled and packages returned to pharmacy stock.');
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-shipments'] });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const togglePkg = (id) => {
    setSelectedPkgIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hospital Distribution & Shipments
          </h1>
          <p className="text-sm text-slate-500">
            Select destination hospitals, assign verified dual-QR packages, and
            dispatch shipments.
          </p>
        </div>

        <Button
          onClick={() => {
            setError(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Shipment
        </Button>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Pharmacy Shipment</DialogTitle>
            <DialogDescription>
              Only active, non-expired packages in CREATED status can be
              assigned.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="destHospital">Destination Hospital</Label>
              <Select
                id="destHospital"
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
              >
                <option value="">Select hospital...</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shpNotes">Dispatch Notes</Label>
              <Input
                id="shpNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cold-chain container #2, seal verified"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Select Available Packages ({selectedPkgIds.length} selected)
              </Label>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {availablePackages.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">
                    No available CREATED packages found. Generate packages in
                    Packages & QR Labels first.
                  </div>
                ) : (
                  availablePackages.map((pkg) => (
                    <label
                      key={pkg.id}
                      className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPkgIds.includes(pkg.id)}
                          onChange={() => togglePkg(pkg.id)}
                        />
                        <div>
                          <span className="font-mono font-semibold">
                            {pkg.packageSerial}
                          </span>{' '}
                          — {pkg.medicine.medicineName} ({pkg.medicine.strength})
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        {pkg.batch.batchNumber}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !hospitalId ||
                  selectedPkgIds.length === 0 ||
                  createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                Create Draft Shipment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Shipment Details — {detail?.shipmentReference}
            </DialogTitle>
            <DialogDescription>
              Destination: {detail?.hospital.name} ({detail?.hospital.code}) ·{' '}
              Status: {detail?.status}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Medicine / Batch</TableHead>
                  <TableHead>Receipt Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(detail?.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-semibold">
                      {item.package.packageSerial}
                    </TableCell>
                    <TableCell>
                      <div>
                        {item.package.medicine.medicineName} (
                        {item.package.medicine.strength})
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {item.package.batch.batchNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.receiptStatus}</Badge>
                      {item.notes && (
                        <div className="text-xs text-slate-500 mt-1">
                          {item.notes}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-teal-700" />
            Outgoing Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading shipments...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Destination Hospital</TableHead>
                  <TableHead>Packages & Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shp) => (
                  <TableRow key={shp.id}>
                    <TableCell className="font-mono font-semibold">
                      {shp.shipmentReference}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{shp.hospital.name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {shp.hospital.code}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>Total: {shp.counts.total}</div>
                      <div className="text-slate-500">
                        Rec: {shp.counts.received} · Pend: {shp.counts.pending}{' '}
                        · Issue: {shp.counts.missing + shp.counts.damaged}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          shp.status === 'RECEIVED'
                            ? 'default'
                            : shp.status === 'CANCELLED'
                              ? 'destructive'
                              : 'warning'
                        }
                      >
                        {shp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailId(shp.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                      {shp.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          onClick={() => dispatchMutation.mutate(shp.id)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Dispatch
                        </Button>
                      )}
                      {(shp.status === 'DRAFT' ||
                        (shp.status === 'DISPATCHED' &&
                          shp.counts.pending === shp.counts.total)) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelMutation.mutate(shp.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
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
};

