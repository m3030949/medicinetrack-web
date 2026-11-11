import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, XCircle } from 'lucide-react';
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

interface PatientOption {
  id: string;
  patientNumber: string;
  patientName: string;
}

interface MedicineOption {
  id: string;
  medicineCode: string;
  medicineName: string;
  strength: string;
}

interface PrescriptionRow {
  id: string;
  prescriptionReference: string;
  prescribingClinician: string;
  status: string;
  prescribedAt: string;
  validUntil: string | null;
  patient: PatientOption;
  items: Array<{
    id: string;
    prescribedDose: string;
    doseUnit: string;
    route: string;
    frequency: string | null;
    medicine: MedicineOption;
  }>;
}

const rxSchema = z.object({
  patientId: z.string().uuid('Select a patient'),
  prescribingClinician: z.string().min(2).max(160),
  medicineId: z.string().uuid('Select a medicine'),
  prescribedDose: z.coerce.number().positive(),
  doseUnit: z.string().min(1).max(32),
  route: z.string().min(1).max(64),
  frequency: z.string().optional(),
  administrationInstructions: z.string().optional(),
});

type RxFormValues = z.infer<typeof rxSchema>;

export function PrescriptionsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['hospital-prescriptions'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: PrescriptionRow[] }>(
        '/prescriptions',
        { params: { limit: 100 } },
      );
      return res.data.items;
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['hospital-patients-options'],
    enabled: open,
    queryFn: async () => {
      const res = await apiClient.get<{ items: PatientOption[] }>('/patients', {
        params: { limit: 100 },
      });
      return res.data.items;
    },
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ['catalog-medicines-options'],
    enabled: open,
    queryFn: async () => {
      const res = await apiClient.get<{ items: MedicineOption[] }>(
        '/pharmacy/medicines',
        { params: { limit: 100 } },
      );
      return res.data.items;
    },
  });

  const form = useForm<RxFormValues>({
    resolver: zodResolver(rxSchema),
    defaultValues: {
      patientId: '',
      prescribingClinician: '',
      medicineId: '',
      prescribedDose: 1,
      doseUnit: 'mg',
      route: 'IV',
      frequency: 'Once daily',
      administrationInstructions: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: RxFormValues) =>
      apiClient.post('/prescriptions', {
        patientId: values.patientId,
        prescribingClinician: values.prescribingClinician,
        items: [
          {
            medicineId: values.medicineId,
            prescribedDose: values.prescribedDose,
            doseUnit: values.doseUnit,
            route: values.route,
            frequency: values.frequency || undefined,
            administrationInstructions:
              values.administrationInstructions || undefined,
          },
        ],
      }),
    onSuccess: (res) => {
      setError(null);
      setFeedback(
        `Controlled prescription ${res.data.prescriptionReference} issued.`,
      );
      setOpen(false);
      form.reset();
      void queryClient.invalidateQueries({
        queryKey: ['hospital-prescriptions'],
      });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/prescriptions/${id}/cancel`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['hospital-prescriptions'],
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Controlled Prescriptions
          </h1>
          <p className="text-sm text-slate-500">
            Author and verify active clinical medication orders for nurse
            administration.
          </p>
        </div>

        <Button
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Prescription
        </Button>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Issue Controlled Prescription</DialogTitle>
            <DialogDescription>
              Required for clinical verification before nurse injection
              administration.
            </DialogDescription>
          </DialogHeader>

          {error && <Alert variant="destructive">{error}</Alert>}

          <form
            onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="patientId">Patient</Label>
                <Select id="patientId" {...form.register('patientId')}>
                  <option value="">Select patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.patientNumber} — {p.patientName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prescribingClinician">
                  Prescribing Clinician
                </Label>
                <Input
                  id="prescribingClinician"
                  placeholder="Dr. Marcus Chen, MD"
                  {...form.register('prescribingClinician')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="medicineId">Prescribed Medicine</Label>
              <Select id="medicineId" {...form.register('medicineId')}>
                <option value="">Select medicine...</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.medicineName} ({m.strength}) — {m.medicineCode}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prescribedDose">Dose</Label>
                <Input
                  id="prescribedDose"
                  type="number"
                  step="any"
                  {...form.register('prescribedDose')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doseUnit">Unit</Label>
                <Input
                  id="doseUnit"
                  placeholder="mg / IU"
                  {...form.register('doseUnit')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="route">Route</Label>
                <Input
                  id="route"
                  placeholder="IV / IM / SC"
                  {...form.register('route')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="frequency">Frequency</Label>
                <Input id="frequency" {...form.register('frequency')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="administrationInstructions">Instructions</Label>
                <Input
                  id="administrationInstructions"
                  placeholder="Slow IV push"
                  {...form.register('administrationInstructions')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Issue Prescription
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-teal-700" />
            Hospital Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading prescriptions...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medication & Dose</TableHead>
                  <TableHead>Clinician</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-mono font-semibold">
                      {rx.prescriptionReference}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {rx.patient.patientName}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {rx.patient.patientNumber}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {rx.items.map((item) => (
                        <div key={item.id}>
                          <span className="font-medium">
                            {item.medicine.medicineName}
                          </span>{' '}
                          — {item.prescribedDose} {item.doseUnit} ({item.route})
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rx.prescribingClinician}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rx.status === 'ACTIVE' ? 'default' : 'secondary'
                        }
                      >
                        {rx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {rx.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelMutation.mutate(rx.id)}
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
}

