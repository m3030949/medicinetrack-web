import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileEdit } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { useAuth } from '@/features/auth/auth-context';
import { apiClient, extractApiError } from '@/lib/api-client';

export const AdministrationDetailPage = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [corrOpen, setCorrOpen] = React.useState(false);
  const [corrReason, setCorrReason] = React.useState('');
  const [amendedSite, setAmendedSite] = React.useState('');
  const [error, setError] = React.useState(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['administration-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient.get(`/administrations/${id}`);
      return res.data;
    },
  });

  const corrMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/administrations/${id}/corrections`, {
        reason: corrReason,
        amendedSite: amendedSite || undefined,
      }),
    onSuccess: () => {
      setCorrOpen(false);
      setCorrReason('');
      setAmendedSite('');
      setError(null);
      void queryClient.invalidateQueries({
        queryKey: ['administration-detail', id],
      });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  if (isLoading || !detail) {
    return (
      <div className="py-12 text-center text-sm text-slate-600">
        Loading administration record...
      </div>
    );
  }

  const backTo =
    user?.role === 'NURSE' ? '/nurse/history' : '/hospital/administrations';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-mono">
              {detail.referenceCode}
            </h1>
            <p className="text-xs text-slate-500">
              {detail.hospital.name} ({detail.hospital.code})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge>{detail.administrationStatus}</Badge>
          {user?.role === 'HOSPITAL_ADMIN' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCorrOpen(true)}
            >
              <FileEdit className="h-4 w-4" />
              Append Correction
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Patient & Clinical Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Patient:</strong> {detail.patient.patientName} (
              <span className="font-mono">{detail.patient.patientNumber}</span>)
            </div>
            <div>
              <strong>Prescription:</strong>{' '}
              {detail.prescription
                ? `${detail.prescription.prescriptionReference} (${detail.prescription.prescribingClinician})`
                : 'N/A'}
            </div>
            <div>
              <strong>Dose & Route:</strong>{' '}
              {detail.actualDose
                ? `${detail.actualDose} ${detail.actualDoseUnit} · ${detail.route}`
                : 'Not administered'}
            </div>
            {detail.administrationSite && (
              <div>
                <strong>Site:</strong> {detail.administrationSite}
              </div>
            )}
            {detail.reason && (
              <div>
                <strong>Notes / Reason:</strong> {detail.reason}
              </div>
            )}
            <div>
              <strong>Nurse:</strong> {detail.nurse.fullName}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Package & Dual-QR Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Medicine:</strong> {detail.package.medicine.medicineName}{' '}
              ({detail.package.medicine.strength})
            </div>
            <div>
              <strong>Package Serial:</strong>{' '}
              <span className="font-mono">{detail.package.packageSerial}</span>
            </div>
            <div>
              <strong>Batch:</strong>{' '}
              <span className="font-mono">
                {detail.package.batch.batchNumber}
              </span>{' '}
              (Exp {detail.package.batch.expiryDate.slice(0, 10)})
            </div>

            <div className="pt-2 space-y-1.5">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Scan Events
              </div>
              {detail.session.scans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded bg-slate-50 px-2.5 py-1.5 text-xs"
                >
                  <span>
                    <strong>{scan.scanType}</strong> —{' '}
                    {scan.verificationStatus}
                    {scan.failureReason ? ` (${scan.failureReason})` : ''}
                  </span>
                  <span className="text-slate-500">
                    {new Date(scan.scannedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {detail.corrections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Audited Corrections (Original Record Preserved)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.corrections.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs space-y-1"
              >
                <div className="font-semibold text-slate-900">
                  {c.reason} — By {c.actor.fullName} ({c.actor.role})
                </div>
                <div className="font-mono text-slate-700">
                  Amended: {JSON.stringify(c.amendedFields)}
                </div>
                <div className="text-slate-500">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={corrOpen} onOpenChange={setCorrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Append Authorized Correction</DialogTitle>
            <DialogDescription>
              The original administration record remains immutable; this
              amendment is appended to the audit trail.
            </DialogDescription>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="corrReason">Correction Reason</Label>
              <Input
                id="corrReason"
                value={corrReason}
                onChange={(e) => setCorrReason(e.target.value)}
                placeholder="Ward chart verified site amendment"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amendedSite">Amended Administration Site</Label>
              <Input
                id="amendedSite"
                value={amendedSite}
                onChange={(e) => setAmendedSite(e.target.value)}
                placeholder="Right Forearm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCorrOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={corrReason.trim().length < 5 || corrMutation.isPending}
                onClick={() => corrMutation.mutate()}
              >
                Append Correction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

