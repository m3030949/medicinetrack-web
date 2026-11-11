import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ShieldCheck, UserCheck } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
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

const createSchema = z.object({
  patientNumber: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9._-]+$/i, 'Letters, numbers, dots, underscores, hyphens only'),
  patientName: z.string().min(2).max(160),
});

export const PatientsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [verifyTarget, setVerifyTarget] = React.useState(null);
  const [verifiedName, setVerifiedName] = React.useState('');
  const [verifyReason, setVerifyReason] = React.useState('');
  const [error, setError] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['hospital-patients', search],
    queryFn: async () => {
      const res = await apiClient.get('/patients', {
        params: { search: search || undefined, limit: 100 },
      });
      return res.data.items;
    },
  });

  const form = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { patientNumber: '', patientName: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values) => apiClient.post('/patients', values),
    onSuccess: (res) => {
      setError(null);
      setFeedback(
        `Registered patient ${res.data.patientNumber} (${res.data.patientName}).`,
      );
      setCreateOpen(false);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const verifyUpdateMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/patients/${verifyTarget.id}/authorized-verify`, {
        patientName: verifiedName,
        reason: verifyReason,
      }),
    onSuccess: () => {
      setVerifyTarget(null);
      setVerifiedName('');
      setVerifyReason('');
      setError(null);
      setFeedback('Authorized patient identity update logged.');
      void queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hospital Patient Registry
          </h1>
          <p className="text-sm text-slate-500">
            Internal hospital-isolated patient registry (no external HIS/EMR
            integration).
          </p>
        </div>

        <Button
          onClick={() => {
            setError(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Register Patient
        </Button>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Hospital Patient</DialogTitle>
            <DialogDescription>
              Identified strictly by Hospital + Patient ID. Only Patient ID and
              Patient Name are stored.
            </DialogDescription>
          </DialogHeader>

          {error && <Alert variant="destructive">{error}</Alert>}

          <form
            onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="patientNumber">Patient ID</Label>
              <Input
                id="patientNumber"
                placeholder="PAT-2026-1042"
                {...form.register('patientNumber')}
              />
              {form.formState.errors.patientNumber && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.patientNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="patientName">Patient Full Name</Label>
              <Input
                id="patientName"
                placeholder="John Doe"
                {...form.register('patientName')}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Register
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(verifyTarget)}
        onOpenChange={(open) => !open && setVerifyTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Authorized Verification — {verifyTarget?.patientNumber}
            </DialogTitle>
            <DialogDescription>
              Resolve a patient name discrepancy with an auditable justification.
            </DialogDescription>
          </DialogHeader>

          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="verifiedName">Verified Patient Name</Label>
              <Input
                id="verifiedName"
                value={verifiedName}
                onChange={(e) => setVerifiedName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verifyReason">Verification Reason</Label>
              <Input
                id="verifyReason"
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                placeholder="Verified wristband and government photo ID"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVerifyTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={
                  verifyReason.trim().length < 5 ||
                  verifyUpdateMutation.isPending
                }
                onClick={() => verifyUpdateMutation.mutate()}
              >
                Save Verified Name
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-teal-700" />
            Hospital Patients ({patients.length})
          </CardTitle>

          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search Patient ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading patients...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Prescriptions / Admin</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  {user?.role === 'HOSPITAL_ADMIN' && (
                    <TableHead className="text-right">Verification</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((pat) => (
                  <TableRow key={pat.id}>
                    <TableCell className="font-mono font-semibold">
                      {pat.patientNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {pat.patientName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {pat._count.prescriptions} Rx ·{' '}
                      {pat._count.administrations} Admin
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {pat.creator.fullName}
                    </TableCell>
                    <TableCell>
                      <Badge>{pat.status}</Badge>
                    </TableCell>
                    {user?.role === 'HOSPITAL_ADMIN' && (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setError(null);
                            setVerifyTarget(pat);
                            setVerifiedName(pat.patientName);
                            setVerifyReason('');
                          }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verify Name
                        </Button>
                      </TableCell>
                    )}
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

