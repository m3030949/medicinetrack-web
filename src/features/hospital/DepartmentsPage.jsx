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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient, extractApiError } from '@/lib/api-client';

const deptSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z0-9-]+$/, 'Uppercase letters, numbers, and hyphens only'),
  name: z.string().min(2).max(120),
});

export const DepartmentsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await apiClient.get('/departments');
      return res.data;
    },
  });

  const form = useForm({
    resolver: zodResolver(deptSchema),
    defaultValues: { code: '', name: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values) => apiClient.post('/departments', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      form.reset();
      setOpen(false);
      setError(null);
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      apiClient.patch(`/departments/${id}`, { isActive }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hospital Departments
          </h1>
          <p className="text-sm text-slate-500">
            Configure clinical wards and assign nursing staff.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Hospital Department</DialogTitle>
              <DialogDescription>
                Departments isolate clinical units within your hospital.
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
              <div className="space-y-1.5">
                <Label htmlFor="code">Department Code</Label>
                <Input
                  id="code"
                  placeholder="ONC-01"
                  {...form.register('code')}
                />
                {form.formState.errors.code && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  placeholder="Oncology Infusion Unit"
                  {...form.register('name')}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Create
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
            Active Wards & Units
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading departments...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Assigned Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-mono font-semibold">
                      {dept.code}
                    </TableCell>
                    <TableCell>{dept.name}</TableCell>
                    <TableCell>{dept._count?.users ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                        {dept.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: dept.id,
                            isActive: !dept.isActive,
                          })
                        }
                      >
                        {dept.isActive ? 'Deactivate' : 'Activate'}
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

