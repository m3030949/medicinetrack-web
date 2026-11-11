import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, PackageCheck } from 'lucide-react';
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

type ReceiptDecision = '' | 'RECEIVED' | 'MISSING' | 'DAMAGED' | 'REJECTED';

interface IncomingShipmentRow {
  id: string;
  shipmentReference: string;
  status: string;
  dispatchedAt: string | null;
  pharmacy: { code: string; name: string };
  counts: {
    total: number;
    pending: number;
    received: number;
    missing: number;
    damaged: number;
    rejected: number;
  };
}

interface ShipmentItemDetail {
  id: string;
  packageId: string;
  receiptStatus: string;
  notes: string | null;
  package: {
    id: string;
    packageSerial: string;
    medicine: { medicineName: string; strength: string };
    batch: { batchNumber: string; expiryDate: string; status: string };
    qrCodes: Array<{ qrType: string; displayCode: string }>;
  };
}

interface ShipmentDetailResponse {
  id: string;
  shipmentReference: string;
  status: string;
  pharmacy: { name: string; code: string };
  items: ShipmentItemDetail[];
}

export function IncomingShipmentsPage() {
  const queryClient = useQueryClient();
  const [activeShipmentId, setActiveShipmentId] = React.useState<string | null>(
    null,
  );
  const [decisions, setDecisions] = React.useState<
    Record<string, { decision: ReceiptDecision; notes: string }>
  >({});
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['hospital-incoming-shipments'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: IncomingShipmentRow[] }>(
        '/shipments',
        { params: { limit: 50 } },
      );
      return res.data.items;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['hospital-shipment-detail', activeShipmentId],
    enabled: Boolean(activeShipmentId),
    queryFn: async () => {
      const res = await apiClient.get<ShipmentDetailResponse>(
        `/shipments/${activeShipmentId}`,
      );
      return res.data;
    },
  });

  React.useEffect(() => {
    if (detail) {
      const init: Record<string, { decision: ReceiptDecision; notes: string }> =
        {};
      for (const item of detail.items) {
        if (item.receiptStatus === 'PENDING') {
          init[item.packageId] = { decision: '', notes: '' };
        }
      }
      setDecisions(init);
    }
  }, [detail]);

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const evaluated = Object.entries(decisions)
        .filter(([, val]) => val.decision !== '')
        .map(([packageId, val]) => ({
          packageId,
          decision: val.decision,
          notes: val.notes || undefined,
        }));

      if (evaluated.length === 0) {
        throw new Error(
          'Explicitly verify at least one package (Received, Missing, Damaged, or Rejected)',
        );
      }

      return apiClient.post(`/shipments/${activeShipmentId}/receive`, {
        items: evaluated,
      });
    },
    onSuccess: (res) => {
      setError(null);
      setFeedback(
        `Shipment receipt recorded (${res.data.summary.received} accepted, ${res.data.summary.remainingPending} remaining pending).`,
      );
      setActiveShipmentId(null);
      void queryClient.invalidateQueries({
        queryKey: ['hospital-incoming-shipments'],
      });
      void queryClient.invalidateQueries({ queryKey: ['hospital-inventory'] });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Incoming Medicine Shipments
        </h1>
        <p className="text-sm text-slate-500">
          Verify physical packages before accepting them into hospital
          administration stock.
        </p>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="h-4 w-4 text-teal-700" />
            Dispatched & Received Shipments
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
                  <TableHead>Source Pharmacy</TableHead>
                  <TableHead>Dispatched</TableHead>
                  <TableHead>Verification Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shp) => (
                  <TableRow key={shp.id}>
                    <TableCell className="font-mono font-semibold">
                      {shp.shipmentReference}
                    </TableCell>
                    <TableCell>
                      <div>{shp.pharmacy.name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {shp.pharmacy.code}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {shp.dispatchedAt
                        ? new Date(shp.dispatchedAt).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      Accepted: {shp.counts.received}/{shp.counts.total} ·
                      Pending: {shp.counts.pending}
                      {(shp.counts.missing > 0 || shp.counts.damaged > 0) && (
                        <div className="text-red-600">
                          Missing: {shp.counts.missing} · Damaged:{' '}
                          {shp.counts.damaged}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          shp.status === 'RECEIVED' ? 'default' : 'warning'
                        }
                      >
                        {shp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={
                          shp.counts.pending > 0 ? 'default' : 'outline'
                        }
                        onClick={() => {
                          setError(null);
                          setActiveShipmentId(shp.id);
                        }}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        {shp.counts.pending > 0
                          ? 'Verify & Receive'
                          : 'View Receipt'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(activeShipmentId)}
        onOpenChange={(open) => !open && setActiveShipmentId(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Verify Shipment — {detail?.shipmentReference}
            </DialogTitle>
            <DialogDescription>
              From {detail?.pharmacy.name}. Only explicitly accepted (RECEIVED)
              packages become available for nurse administration.
            </DialogDescription>
          </DialogHeader>

          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package / QR</TableHead>
                  <TableHead>Medicine & Batch</TableHead>
                  <TableHead>Verification Decision</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(detail?.items ?? []).map((item) => {
                  const outer = item.package.qrCodes.find(
                    (q) => q.qrType === 'OUTER',
                  );
                  const state = decisions[item.packageId];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-mono font-semibold">
                          {item.package.packageSerial}
                        </div>
                        {outer && (
                          <div className="text-xs font-mono text-slate-500">
                            {outer.displayCode}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {item.package.medicine.medicineName} (
                          {item.package.medicine.strength})
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {item.package.batch.batchNumber} · Exp{' '}
                          {item.package.batch.expiryDate.slice(0, 10)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.receiptStatus !== 'PENDING' ? (
                          <Badge
                            variant={
                              item.receiptStatus === 'RECEIVED'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {item.receiptStatus}
                          </Badge>
                        ) : (
                          <Select
                            aria-label={`Decision for ${item.package.packageSerial}`}
                            value={state?.decision ?? ''}
                            onChange={(e) =>
                              setDecisions((prev) => ({
                                ...prev,
                                [item.packageId]: {
                                  decision: e.target.value as ReceiptDecision,
                                  notes: prev[item.packageId]?.notes ?? '',
                                },
                              }))
                            }
                          >
                            <option value="">-- Pending Verification --</option>
                            <option value="RECEIVED">
                              RECEIVED (Accept into stock)
                            </option>
                            <option value="MISSING">MISSING</option>
                            <option value="DAMAGED">DAMAGED</option>
                            <option value="REJECTED">
                              REJECTED (Quarantine)
                            </option>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.receiptStatus !== 'PENDING' ? (
                          <span className="text-xs text-slate-500">
                            {item.notes ?? '—'}
                          </span>
                        ) : (
                          <Input
                            placeholder="Condition / discrepancy notes"
                            value={state?.notes ?? ''}
                            onChange={(e) =>
                              setDecisions((prev) => ({
                                ...prev,
                                [item.packageId]: {
                                  decision:
                                    prev[item.packageId]?.decision ?? '',
                                  notes: e.target.value,
                                },
                              }))
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setActiveShipmentId(null)}
            >
              Close
            </Button>
            {detail?.items.some((i) => i.receiptStatus === 'PENDING') && (
              <Button
                disabled={receiveMutation.isPending}
                onClick={() => receiveMutation.mutate()}
              >
                {receiveMutation.isPending
                  ? 'Recording...'
                  : 'Confirm Verified Items'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

