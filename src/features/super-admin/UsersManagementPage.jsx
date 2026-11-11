import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
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
import { useAuth } from '@/features/auth/auth-context';
import { apiClient, extractApiError } from '@/lib/api-client';

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(160),
  password: z
    .string()
    .min(10, 'Minimum 10 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
      'Must include uppercase, lowercase, number, and symbol',
    ),
  role: z.enum([
    'SUPER_ADMIN',
    'PHARMACY_ADMIN',
    'HOSPITAL_ADMIN',
    'CLINICIAN',
    'NURSE',
  ]),
  organizationId: z.string().optional(),
  departmentId: z.string().optional(),
  employeeCode: z.string().optional(),
});

const availableRolesForActor = (role) => {
  if (role === 'SUPER_ADMIN') {
    return [
      'SUPER_ADMIN',
      'PHARMACY_ADMIN',
      'HOSPITAL_ADMIN',
      'CLINICIAN',
      'NURSE',
    ];
  }
  if (role === 'PHARMACY_ADMIN') {
    return ['PHARMACY_ADMIN'];
  }
  if (role === 'HOSPITAL_ADMIN') {
    return ['NURSE', 'CLINICIAN', 'HOSPITAL_ADMIN'];
  }
  return [];
};

export const UsersManagementPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(null);

  const allowedRoles = user ? availableRolesForActor(user.role) : [];

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get('/users');
      return res.data;
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    enabled: user?.role === 'SUPER_ADMIN',
    queryFn: async () => {
      const res = await apiClient.get('/organizations');
      return res.data;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    enabled: user?.role === 'HOSPITAL_ADMIN',
    queryFn: async () => {
      const res = await apiClient.get('/departments');
      return res.data;
    },
  });

  const form = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: allowedRoles[0] ?? 'NURSE',
      email: '',
      fullName: '',
      password: '',
    },
  });

  const selectedRole = form.watch('role');

  const createMutation = useMutation({
    mutationFn: async (values) =>
      apiClient.post('/users', {
        ...values,
        organizationId: values.organizationId || undefined,
        departmentId: values.departmentId || undefined,
        employeeCode: values.employeeCode || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      form.reset({ role: allowedRoles[0] ?? 'NURSE' });
      setOpen(false);
      setError(null);
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) =>
      apiClient.patch(`/users/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user?.role === 'HOSPITAL_ADMIN'
              ? 'Hospital Nurses & Clinical Staff'
              : 'User Management'}
          </h1>
          <p className="text-sm text-slate-500">
            Provision and manage role-authorized accounts within your scope.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Provision User Account</DialogTitle>
              <DialogDescription>
                Role and organization permissions are strictly enforced by the
                API.
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
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" {...form.register('fullName')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register('email')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="employeeCode">Employee ID</Label>
                  <Input
                    id="employeeCode"
                    placeholder="RN-204"
                    {...form.register('employeeCode')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select id="role" {...form.register('role')}>
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>

                {user?.role === 'SUPER_ADMIN' &&
                  selectedRole !== 'SUPER_ADMIN' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="organizationId">Organization</Label>
                      <Select
                        id="organizationId"
                        {...form.register('organizationId')}
                      >
                        <option value="">Select organization...</option>
                        {organizations.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.type})
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                {user?.role === 'HOSPITAL_ADMIN' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="departmentId">Department</Label>
                    <Select
                      id="departmentId"
                      {...form.register('departmentId')}
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
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
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-teal-700" />
            Authorized Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization / Dept</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.fullName}
                      {row.employeeCode && (
                        <div className="text-xs text-slate-500 font-mono">
                          {row.employeeCode}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.organization ? row.organization.name : 'Platform'}
                      {row.department && (
                        <div className="text-xs text-slate-500">
                          {row.department.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === 'ACTIVE' ? 'default' : 'destructive'
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.id !== user?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            statusMutation.mutate({
                              id: row.id,
                              status:
                                row.status === 'ACTIVE'
                                  ? 'SUSPENDED'
                                  : 'ACTIVE',
                            })
                          }
                        >
                          {row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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

