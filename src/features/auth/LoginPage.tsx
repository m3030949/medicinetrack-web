import { zodResolver } from '@hookform/resolvers/zod';
import { Pill, ShieldAlert } from 'lucide-react';
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
import {
  getDefaultHomeForRole,
  useAuth,
} from '@/features/auth/auth-context';
import { extractApiError } from '@/lib/api-client';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const mfaSchema = z.object({
  code: z.string().min(6, 'Enter 6-digit TOTP or recovery code').max(32),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type MfaFormValues = z.infer<typeof mfaSchema>;

export function LoginPage() {
  const { user, login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [challengeToken, setChallengeToken] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (user) {
      navigate(getDefaultHomeForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mfaForm = useForm<MfaFormValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  const handleLoginSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      const result = await login(values.email, values.password);
      if (result.mfaRequired && result.challengeToken) {
        setChallengeToken(result.challengeToken);
        return;
      }
      if (result.user) {
        navigate(getDefaultHomeForRole(result.user.role), { replace: true });
      }
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handleMfaSubmit = async (values: MfaFormValues) => {
    if (!challengeToken) return;
    setError(null);
    try {
      const loggedInUser = await verifyMfa(challengeToken, values.code);
      navigate(getDefaultHomeForRole(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Pill className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">MedicineTrack</CardTitle>
          <CardDescription>
            {challengeToken
              ? 'Enter your authenticator verification code'
              : 'Sign in to your authorized pharmacy or hospital workspace'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </Alert>
          )}

          {!challengeToken ? (
            <form
              onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@organization.org"
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-red-600">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...loginForm.register('password')}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-600">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginForm.formState.isSubmitting}
              >
                {loginForm.formState.isSubmitting
                  ? 'Signing in...'
                  : 'Sign In'}
              </Button>

              <div className="border-t border-slate-200 pt-3 text-center text-sm text-slate-600">
                New pharmacy or hospital user?{' '}
                <Link
                  to="/signup"
                  className="font-medium text-teal-700 hover:underline"
                >
                  Create an account
                </Link>
              </div>
            </form>
          ) : (
            <form
              onSubmit={mfaForm.handleSubmit(handleMfaSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="code">TOTP or Recovery Code</Label>
                <Input
                  id="code"
                  type="text"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  {...mfaForm.register('code')}
                />
                {mfaForm.formState.errors.code && (
                  <p className="text-xs text-red-600">
                    {mfaForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setChallengeToken(null);
                    setError(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={mfaForm.formState.isSubmitting}
                >
                  Verify MFA
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

