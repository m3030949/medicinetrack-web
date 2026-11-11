import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
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
  DialogTrigger,
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

const createOrgSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9-]+$/, 'Uppercase letters, numbers, and hyphens only'),
  name: z.string().min(2).max(200),
  type: z.enum(['PHARMACY', 'HOSPITAL']),
  licenseNo: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export const OrganizationsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(null);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations');
      return res.data;
    },
  });

  const form = useForm({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { type: 'HOSPITAL', code: '', name: '' },
  });

  const createMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        ...values,
        contactEmail: values.contactEmail || undefined,
      };
      return apiClient.post('/organizations', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      form.reset({ type: 'HOSPITAL', code: '', name: '' });
      setOpen(false);
      setError(null);
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }) =>
      apiClient.patch(`/organizations/${id}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
          <p className="text-sm text-slate-500">
            Register and govern isolated Pharmacy and Hospital tenants.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Organization</DialogTitle>
              <DialogDescription>
                Create a pharmacy or hospital organization with strict tenant
                isolation.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="mb-3">
                {error}
              </Alert>
            )}

            <form
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Org Code</Label>
                  <Input
                    id="code"
                    placeholder="HOSP-002"
                    {...form.register('code')}
                  />
                  {form.formState.errors.code && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.code.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type">Type</Label>
                  <Select id="type" {...form.register('type')}>
                    <option value="HOSPITAL">HOSPITAL</option>
                    <option value="PHARMACY">PHARMACY</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  placeholder="Mercy Regional Medical Center"
                  {...form.register('name')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="licenseNo">License Number</Label>
                  <Input id="licenseNo" {...form.register('licenseNo')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    {...form.register('contactEmail')}
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
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-teal-700" />
            Registered Pharmacies & Hospitals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading organizations...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-mono font-semibold">
                      {org.code}
                    </TableCell>
                    <TableCell>{org.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{org.type}</Badge>
                    </TableCell>
                    <TableCell>{org._count.users}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          org.status === 'ACTIVE' ? 'default' : 'destructive'
                        }
                      >
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            id: org.id,
                            status:
                              org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                          })
                        }
                      >
                        {org.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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
};

