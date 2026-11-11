import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/features/auth/auth-context';
import { apiClient, extractApiError } from '@/lib/api-client';

const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(10, 'Minimum 10 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
      'Must include uppercase, lowercase, number, and symbol',
    ),
});

type PasswordValues = z.infer<typeof passwordSchema>;

interface MfaSetupResponse {
  otpauthUrl: string;
  manualEntrySecret: string;
  recoveryCodes: string[];
}

export function SecuritySettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [mfaSetup, setMfaSetup] = React.useState<MfaSetupResponse | null>(null);
  const [totpCode, setTotpCode] = React.useState('');
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const handleStartMfa = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await apiClient.post<MfaSetupResponse>('/auth/mfa/setup');
      setMfaSetup(res.data);
    } catch (err) {
      setErrorMsg(extractApiError(err));
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiClient.post('/auth/mfa/confirm', { code: totpCode });
      setMfaSetup(null);
      setTotpCode('');
      setStatusMsg('Two-factor authentication has been enabled.');
      await refreshProfile();
    } catch (err) {
      setErrorMsg(extractApiError(err));
    }
  };

  const handlePasswordChange = async (values: PasswordValues) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await apiClient.post('/auth/change-password', values);
      form.reset();
      setStatusMsg('Password updated and existing refresh sessions revoked.');
    } catch (err) {
      setErrorMsg(extractApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Account Security & MFA
        </h1>
        <p className="text-sm text-slate-500">
          Protect clinical access with authenticator-based MFA and strong
          passwords.
        </p>
      </div>

      {statusMsg && <Alert variant="success">{statusMsg}</Alert>}
      {errorMsg && <Alert variant="destructive">{errorMsg}</Alert>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
                Multi-Factor Authentication (TOTP)
              </CardTitle>
              <Badge variant={user?.mfaEnabled ? 'default' : 'warning'}>
                {user?.mfaEnabled ? 'Enabled' : 'Not Configured'}
              </Badge>
            </div>
            <CardDescription>
              Required for privileged Pharmacy, Hospital, and Platform
              administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!mfaSetup ? (
              <Button onClick={handleStartMfa}>
                {user?.mfaEnabled ? 'Reconfigure TOTP MFA' : 'Enable TOTP MFA'}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <QRCodeSVG value={mfaSetup.otpauthUrl} size={160} />
                  <p className="mt-3 text-xs text-slate-500">
                    Manual Key:{' '}
                    <code className="font-mono font-semibold text-slate-800">
                      {mfaSetup.manualEntrySecret}
                    </code>
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">
                    Save these single-use recovery codes securely:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-3 font-mono text-xs">
                    {mfaSetup.recoveryCodes.map((code) => (
                      <div key={code}>{code}</div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleConfirmMfa} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="totp">Enter 6-digit code to verify</Label>
                    <Input
                      id="totp"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder="123456"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMfaSetup(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Confirm & Activate</Button>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-teal-700" />
              Change Password
            </CardTitle>
            <CardDescription>
              Use at least 10 characters with mixed case, numbers, and symbols.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(handlePasswordChange)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...form.register('currentPassword')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...form.register('newPassword')}
                />
                {form.formState.errors.newPassword && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

