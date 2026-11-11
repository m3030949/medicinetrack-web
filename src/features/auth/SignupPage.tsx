import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, CheckCircle2, Pill, ShieldAlert, UserPlus } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  getDefaultHomeForRole,
  useAuth,
} from '@/features/auth/auth-context';
import { extractApiError } from '@/lib/api-client';
import type { OrganizationType, SignupPayload, UserRole } from '@/types/auth';

const signupSchema = z
  .object({
    mode: z.enum(['NEW_ORGANIZATION', 'JOIN_ORGANIZATION']),
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(160),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(10, 'Minimum 10 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        'Must include uppercase, lowercase, number, and symbol',
      ),
    confirmPassword: z.string(),
    organizationType: z.enum(['PHARMACY', 'HOSPITAL']).optional(),
    organizationName: z.string().max(200).optional(),
    organizationCode: z.string().max(32).optional(),
    licenseNo: z.string().max(100).optional(),
    role: z
      .enum(['PHARMACY_ADMIN', 'HOSPITAL_ADMIN', 'CLINICIAN', 'NURSE'])
      .optional(),
    employeeCode: z.string().max(64).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
    if (data.mode === 'NEW_ORGANIZATION') {
      if (!data.organizationName || data.organizationName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organizationName'],
          message: 'Organization name is required',
        });
      }
      if (!data.organizationType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organizationType'],
          message: 'Select Pharmacy or Hospital',
        });
      }
    } else {
      if (!data.organizationCode || data.organizationCode.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organizationCode'],
          message: 'Enter your organization code (e.g. HOSP-001 or PHARM-001)',
        });
      }
      if (!data.role) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['role'],
          message: 'Select a staff role',
        });
      }
    }
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (user) {
      navigate(getDefaultHomeForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      mode: 'NEW_ORGANIZATION',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      organizationType: 'PHARMACY',
      organizationName: '',
      organizationCode: '',
      licenseNo: '',
      role: 'NURSE',
      employeeCode: '',
    },
  });

  const mode = form.watch('mode');

  const handleSubmit = async (values: SignupFormValues) => {
    setError(null);
    setPendingMessage(null);
    try {
      const payload: SignupPayload =
        values.mode === 'NEW_ORGANIZATION'
          ? {
              mode: 'NEW_ORGANIZATION',
              fullName: values.fullName.trim(),
              email: values.email.trim(),
              password: values.password,
              organizationType: values.organizationType as OrganizationType,
              organizationName: values.organizationName?.trim(),
              organizationCode: values.organizationCode?.trim() || undefined,
              licenseNo: values.licenseNo?.trim() || undefined,
            }
          : {
              mode: 'JOIN_ORGANIZATION',
              fullName: values.fullName.trim(),
              email: values.email.trim(),
              password: values.password,
              organizationCode: values.organizationCode?.trim().toUpperCase(),
              role: values.role as Exclude<UserRole, 'SUPER_ADMIN'>,
              employeeCode: values.employeeCode?.trim() || undefined,
            };

      const result = await signup(payload);
      if (result.pendingApproval) {
        setPendingMessage(
          result.message ??
            'Account submitted for administrator approval. You can sign in once activated.',
        );
        return;
      }

      navigate(getDefaultHomeForRole(result.user.role), { replace: true });
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Pill className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Create MedicineTrack Account</CardTitle>
          <CardDescription>
            Register an isolated pharmacy/hospital workspace or request staff
            access to an existing organization.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </Alert>
          )}

          {pendingMessage ? (
            <div className="space-y-4">
              <Alert variant="success" className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Registration Submitted</p>
                  <p>{pendingMessage}</p>
                </div>
              </Alert>
              <Link to="/login" className="block">
                <Button className="w-full">Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    form.setValue('mode', 'NEW_ORGANIZATION');
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    mode === 'NEW_ORGANIZATION'
                      ? 'border-teal-700 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  New Organization
                </button>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue('mode', 'JOIN_ORGANIZATION');
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    mode === 'JOIN_ORGANIZATION'
                      ? 'border-teal-700 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Join Organization
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Nishant Sharma"
                    {...form.register('fullName')}
                  />
                  {form.formState.errors.fullName && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signupEmail">Work Email</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="name@organization.org"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {mode === 'NEW_ORGANIZATION' ? (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="organizationType">Organization Type</Label>
                      <Select
                        id="organizationType"
                        {...form.register('organizationType')}
                      >
                        <option value="PHARMACY">Pharmacy / Distributor</option>
                        <option value="HOSPITAL">Hospital / Clinic</option>
                      </Select>
                      {form.formState.errors.organizationType && (
                        <p className="text-xs text-red-600">
                          {form.formState.errors.organizationType.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="organizationName">Organization Name</Label>
                      <Input
                        id="organizationName"
                        placeholder="Central Care Pharmacy"
                        {...form.register('organizationName')}
                      />
                      {form.formState.errors.organizationName && (
                        <p className="text-xs text-red-600">
                          {form.formState.errors.organizationName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="orgCodeOptional">
                        Organization Code (optional)
                      </Label>
                      <Input
                        id="orgCodeOptional"
                        placeholder="Auto-generated if blank"
                        {...form.register('organizationCode')}
                      />
                      {form.formState.errors.organizationCode && (
                        <p className="text-xs text-red-600">
                          {form.formState.errors.organizationCode.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="licenseNo">License No. (optional)</Label>
                      <Input
                        id="licenseNo"
                        placeholder="LIC-2026-001"
                        {...form.register('licenseNo')}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="joinOrgCode">Organization Code</Label>
                      <Input
                        id="joinOrgCode"
                        placeholder="HOSP-001 or PHARM-001"
                        {...form.register('organizationCode')}
                      />
                      {form.formState.errors.organizationCode && (
                        <p className="text-xs text-red-600">
                          {form.formState.errors.organizationCode.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="joinRole">Requested Role</Label>
                      <Select id="joinRole" {...form.register('role')}>
                        <option value="NURSE">Nurse (Hospital)</option>
                        <option value="CLINICIAN">Clinician (Hospital)</option>
                        <option value="HOSPITAL_ADMIN">Hospital Admin</option>
                        <option value="PHARMACY_ADMIN">Pharmacy Admin</option>
                      </Select>
                      {form.formState.errors.role && (
                        <p className="text-xs text-red-600">
                          {form.formState.errors.role.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="employeeCode">
                      Employee / Badge ID (optional)
                    </Label>
                    <Input
                      id="employeeCode"
                      placeholder="RN-204"
                      {...form.register('employeeCode')}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="signupPassword">Password</Label>
                  <Input
                    id="signupPassword"
                    type="password"
                    autoComplete="new-password"
                    {...form.register('password')}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    {...form.register('confirmPassword')}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Password must be at least 10 characters and include uppercase,
                lowercase, number, and symbol.
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? 'Creating account...'
                  : mode === 'NEW_ORGANIZATION'
                    ? 'Create Workspace & Sign In'
                    : 'Request Staff Access'}
              </Button>
            </form>
          )}

          <div className="border-t border-slate-200 pt-3 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-teal-700 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

