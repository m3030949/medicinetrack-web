import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Download,
  FileText,
  History,
  Printer,
  QrCode,
  Search,
} from 'lucide-react';
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
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

interface QrSummary {
  id: string;
  qrType: 'OUTER' | 'INNER';
  displayCode: string;
  status: string;
  reprintCount: number;
  lastPrintedAt: string | null;
}

interface PackageRow {
  id: string;
  packageSerial: string;
  status: string;
  medicine: {
    medicineName: string;
    strength: string;
  };
  batch: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    status: string;
  };
  qrCodes: QrSummary[];
}

interface BatchOption {
  id: string;
  batchNumber: string;
  quantity: number;
  status: string;
  medicine: { medicineName: string; strength: string };
  _count: { packages: number };
}

interface QrHistoryResponse {
  packageSerial: string;
  qrVersions: Array<QrSummary & { revokeReason: string | null; createdAt: string }>;
  history: Array<{
    id: string;
    action: string;
    notes: string | null;
    createdAt: string;
    actor: { fullName: string; email: string } | null;
  }>;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function PackagesQrPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [batchId, setBatchId] = React.useState(
    searchParams.get('batchId') ?? '',
  );
  const [count, setCount] = React.useState(5);
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [reprintPkg, setReprintPkg] = React.useState<PackageRow | null>(null);
  const [reprintReason, setReprintReason] = React.useState('');
  const [historyPkgId, setHistoryPkgId] = React.useState<string | null>(null);
  const [revokeReason, setRevokeReason] = React.useState('');

  const { data: batches = [] } = useQuery({
    queryKey: ['pharmacy-batches-active'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: BatchOption[] }>(
        '/pharmacy/batches',
        { params: { status: 'ACTIVE', limit: 100 } },
      );
      return res.data.items;
    },
  });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['pharmacy-packages', search],
    queryFn: async () => {
      const res = await apiClient.get<{ items: PackageRow[] }>(
        '/pharmacy/packages',
        { params: { search: search || undefined, limit: 100 } },
      );
      return res.data.items;
    },
  });

  const { data: qrHistory } = useQuery({
    queryKey: ['package-qr-history', historyPkgId],
    enabled: Boolean(historyPkgId),
    queryFn: async () => {
      const res = await apiClient.get<QrHistoryResponse>(
        `/pharmacy/packages/${historyPkgId}/qr-history`,
      );
      return res.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error('Select an active batch first');
      if (count === 1) {
        return apiClient.post('/pharmacy/packages/generate', { batchId });
      }
      return apiClient.post('/pharmacy/packages/bulk-generate', {
        batchId,
        count,
      });
    },
    onSuccess: (res) => {
      setError(null);
      setFeedback(
        `Generated ${res.data.generatedCount} physical package(s) with unique OUTER + INNER QR pairs.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-packages'] });
      void queryClient.invalidateQueries({
        queryKey: ['pharmacy-batches-active'],
      });
    },
    onError: (err) => {
      setFeedback(null);
      setError(extractApiError(err));
    },
  });

  const downloadFile = async (
    url: string,
    filename: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ) => {
    try {
      const res = await apiClient.request<Blob>({
        url,
        method,
        data: body,
        responseType: 'blob',
      });
      triggerBlobDownload(res.data, filename);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const reprintMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<Blob>(
        `/pharmacy/packages/${reprintPkg!.id}/reprint`,
        { reason: reprintReason },
        { responseType: 'blob' },
      );
      return res.data;
    },
    onSuccess: (blob) => {
      triggerBlobDownload(blob, `${reprintPkg!.packageSerial}-reprint.pdf`);
      setReprintPkg(null);
      setReprintReason('');
      setFeedback('Label reprinted while preserving original package identity.');
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-packages'] });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ pkgId, qrId }: { pkgId: string; qrId: string }) =>
      apiClient.post(`/pharmacy/packages/${pkgId}/qr/${qrId}/revoke`, {
        reason: revokeReason || 'Damaged physical sticker replacement',
        issueReplacement: true,
      }),
    onSuccess: () => {
      setRevokeReason('');
      setFeedback('QR revoked and replacement QR issued for same package.');
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-packages'] });
      void queryClient.invalidateQueries({
        queryKey: ['package-qr-history', historyPkgId],
      });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Packages & Dual-QR Label Center
        </h1>
        <p className="text-sm text-slate-500">
          Generate cryptographically unique Outside Box + Inside Vial QR pairs
          and printable PDF sheets.
        </p>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-teal-700" />
            Generate Physical Packages & Dual QRs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="batchId">Active Batch</Label>
              <Select
                id="batchId"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              >
                <option value="">Select active batch...</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} — {b.medicine.medicineName} (
                    {b.quantity - b._count.packages} remaining)
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pkgCount">Package Count (1–500)</Label>
              <Input
                id="pkgCount"
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>

            <Button
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending
                ? 'Generating...'
                : count === 1
                  ? 'Generate Single Package'
                  : `Bulk Generate (${count})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">
            Generated Packages ({packages.length})
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                size="sm"
                onClick={() =>
                  void downloadFile(
                    '/pharmacy/packages/bulk-qr-labels/pdf',
                    `medicinetrack-bulk-labels-${selectedIds.length}.pdf`,
                    'POST',
                    { packageIds: selectedIds },
                  )
                }
              >
                <Download className="h-4 w-4" />
                Download Bulk PDF ({selectedIds.length})
              </Button>
            )}

            <div className="relative w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search PKG- or QR code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading packages...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Sel</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Medicine / Batch</TableHead>
                  <TableHead>Outside QR</TableHead>
                  <TableHead>Inside QR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Labels & Audit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => {
                  const outer = pkg.qrCodes.find((q) => q.qrType === 'OUTER');
                  const inner = pkg.qrCodes.find((q) => q.qrType === 'INNER');
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select ${pkg.packageSerial}`}
                          checked={selectedIds.includes(pkg.id)}
                          onChange={() => toggleSelect(pkg.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {pkg.packageSerial}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {pkg.medicine.medicineName} ({pkg.medicine.strength})
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {pkg.batch.batchNumber} · Exp{' '}
                          {pkg.batch.expiryDate.slice(0, 10)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {outer ? (
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-semibold">
                              {outer.displayCode}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void downloadFile(
                                  `/pharmacy/packages/${pkg.id}/qr/OUTER/download`,
                                  `${pkg.packageSerial}-OUTER.png`,
                                )
                              }
                              className="block text-xs text-teal-700 hover:underline cursor-pointer"
                            >
                              PNG
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {inner ? (
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-semibold">
                              {inner.displayCode}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void downloadFile(
                                  `/pharmacy/packages/${pkg.id}/qr/INNER/download`,
                                  `${pkg.packageSerial}-INNER.png`,
                                )
                              }
                              className="block text-xs text-teal-700 hover:underline cursor-pointer"
                            >
                              PNG
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pkg.status === 'RECALLED'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {pkg.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void downloadFile(
                              `/pharmacy/packages/${pkg.id}/qr-labels/pdf`,
                              `${pkg.packageSerial}-labels.pdf`,
                            )
                          }
                        >
                          <FileText className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReprintPkg(pkg)}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Reprint
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setHistoryPkgId(pkg.id)}
                        >
                          <History className="h-3.5 w-3.5" />
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
        open={Boolean(reprintPkg)}
        onOpenChange={(open) => !open && setReprintPkg(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reprint Labels — {reprintPkg?.packageSerial}
            </DialogTitle>
            <DialogDescription>
              Reprinting preserves the original package and QR identities and
              logs an auditable reprint count.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reprintReason">Reprint Reason</Label>
              <Input
                id="reprintReason"
                value={reprintReason}
                onChange={(e) => setReprintReason(e.target.value)}
                placeholder="Label printer misalignment / smudged ink"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReprintPkg(null)}>
                Cancel
              </Button>
              <Button
                disabled={
                  reprintReason.trim().length < 3 || reprintMutation.isPending
                }
                onClick={() => reprintMutation.mutate()}
              >
                Reprint PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(historyPkgId)}
        onOpenChange={(open) => !open && setHistoryPkgId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              QR Lifecycle & History — {qrHistory?.packageSerial}
            </DialogTitle>
            <DialogDescription>
              Manage active/revoked QR versions and inspect full generation
              events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="revokeReason">
                Optional Reason (if revoking & replacing a damaged QR)
              </Label>
              <Input
                id="revokeReason"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Physical vial sticker scratched"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-500">
                QR Token Versions
              </div>
              {(qrHistory?.qrVersions ?? []).map((qr) => (
                <div
                  key={qr.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <div>
                    <span className="font-semibold">{qr.qrType}</span> ·{' '}
                    <span className="font-mono">{qr.displayCode}</span> ·
                    Reprints: {qr.reprintCount}
                    {qr.revokeReason && (
                      <div className="text-xs text-red-600">
                        Revoked: {qr.revokeReason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        qr.status === 'ACTIVE' ? 'default' : 'destructive'
                      }
                    >
                      {qr.status}
                    </Badge>
                    {qr.status === 'ACTIVE' && historyPkgId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          revokeMutation.mutate({
                            pkgId: historyPkgId,
                            qrId: qr.id,
                          })
                        }
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Revoke & Replace
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Audit Events
              </div>
              {(qrHistory?.history ?? []).map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg bg-slate-50 p-2.5 text-xs flex justify-between gap-4"
                >
                  <div>
                    <span className="font-semibold">{log.action}</span> —{' '}
                    {log.notes}
                  </div>
                  <div className="text-slate-500 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

