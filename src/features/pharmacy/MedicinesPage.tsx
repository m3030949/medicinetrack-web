import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Pill, Plus, Search } from 'lucide-react';
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
import { apiClient, extractApiError } from '@/lib/api-client';

interface MedicineRow {
  id: string;
  medicineCode: string;
  medicineName: string;
  genericName: string;
  manufacturer: string;
  strength: string;
  dosageForm: string;
  description: string | null;
  storageRequirements: string | null;
  isActive: boolean;
  _count: { batches: number; packages: number };
}

interface PaginatedMedicines {
  items: MedicineRow[];
  meta: { total: number; page: number; totalPages: number };
}

const medicineSchema = z.object({
  medicineCode: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9-]+$/, 'Uppercase letters, numbers, and hyphens only'),
  medicineName: z.string().min(2).max(200),
  genericName: z.string().min(2).max(200),
  manufacturer: z.string().min(2).max(200),
  strength: z.string().min(1).max(100),
  dosageForm: z.string().min(2).max(100),
  description: z.string().optional(),
  storageRequirements: z.string().optional(),
});

type MedicineFormValues = z.infer<typeof medicineSchema>;

export function MedicinesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MedicineRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy-medicines', search],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedMedicines>(
        '/pharmacy/medicines',
        { params: { search: search || undefined, limit: 50 } },
      );
      return res.data;
    },
  });

  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      medicineCode: '',
      medicineName: '',
      genericName: '',
      manufacturer: '',
      strength: '',
      dosageForm: 'Injectable Solution (Vial)',
      description: '',
      storageRequirements: '',
    },
  });

  const openCreate = () => {
    setEditing(null);
    setError(null);
    form.reset({
      medicineCode: '',
      medicineName: '',
      genericName: '',
      manufacturer: '',
      strength: '',
      dosageForm: 'Injectable Solution (Vial)',
      description: '',
      storageRequirements: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (med: MedicineRow) => {
    setEditing(med);
    setError(null);
    form.reset({
      medicineCode: med.medicineCode,
      medicineName: med.medicineName,
      genericName: med.genericName,
      manufacturer: med.manufacturer,
      strength: med.strength,
      dosageForm: med.dosageForm,
      description: med.description ?? '',
      storageRequirements: med.storageRequirements ?? '',
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: MedicineFormValues) => {
      if (editing) {
        const { medicineCode: _omit, ...rest } = values;
        return apiClient.patch(`/pharmacy/medicines/${editing.id}`, rest);
      }
      return apiClient.post('/pharmacy/medicines', values);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-medicines'] });
      setDialogOpen(false);
      setError(null);
    },
    onError: (err) => setError(extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Medicine Catalog
          </h1>
          <p className="text-sm text-slate-500">
            Register injectable medicines, strengths, and cold-chain storage
            rules.
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Medicine
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Update Medicine' : 'Register Medicine'}
            </DialogTitle>
            <DialogDescription>
              Catalog entries belong exclusively to your pharmacy.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="mb-3">
              {error}
            </Alert>
          )}

          <form
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="medicineCode">Catalog Code</Label>
                <Input
                  id="medicineCode"
                  disabled={Boolean(editing)}
                  placeholder="MED-EPI-01"
                  {...form.register('medicineCode')}
                />
                {form.formState.errors.medicineCode && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.medicineCode.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  placeholder="Pfizer / Hospira"
                  {...form.register('manufacturer')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="medicineName">Brand / Medicine Name</Label>
                <Input
                  id="medicineName"
                  placeholder="Epinephrine Injection"
                  {...form.register('medicineName')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="genericName">Generic Name</Label>
                <Input
                  id="genericName"
                  placeholder="Epinephrine"
                  {...form.register('genericName')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="strength">Strength</Label>
                <Input
                  id="strength"
                  placeholder="1 mg/mL"
                  {...form.register('strength')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dosageForm">Dosage Form</Label>
                <Input
                  id="dosageForm"
                  placeholder="Single-Dose Vial"
                  {...form.register('dosageForm')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storageRequirements">Storage Requirements</Label>
              <Input
                id="storageRequirements"
                placeholder="Refrigerate 2°C - 8°C; protect from light"
                {...form.register('storageRequirements')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description / Clinical Notes</Label>
              <Input id="description" {...form.register('description')} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Medicine'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-teal-700" />
            Catalog Items ({data?.meta.total ?? 0})
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading medicines...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Strength / Form</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Batches / Pkgs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-mono font-semibold">
                      {med.medicineCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {med.medicineName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {med.genericName} · {med.manufacturer}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{med.strength}</div>
                      <div className="text-xs text-slate-500">
                        {med.dosageForm}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs">
                      {med.storageRequirements || 'Standard ambient'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {med._count.batches} batches · {med._count.packages} pkgs
                    </TableCell>
                    <TableCell>
                      <Badge variant={med.isActive ? 'default' : 'secondary'}>
                        {med.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(med)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
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

