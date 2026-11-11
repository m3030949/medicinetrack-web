import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Home, Info, Syringe } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';

export const AdministrationSuccessPage = () => {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ['administration-session-success', sessionId],
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const res = await apiClient.get(`/administrations/sessions/${sessionId}`);
      return res.data;
    },
  });

  const startNewMutation = useMutation({
    mutationFn: () => apiClient.post('/administrations/start', {}),
    onSuccess: (res) => {
      navigate(`/nurse/administer/${res.data.id}`);
    },
  });

  if (isLoading || !session) {
    return (
      <div className="py-12 text-center text-sm text-slate-600">
        Loading administration summary...
      </div>
    );
  }

  const admin = session.administration;
  const isSuccess =
    admin?.administrationStatus === 'ADMINISTERED' ||
    admin?.administrationStatus === 'PARTIALLY_ADMINISTERED';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="border-emerald-200">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">
            {isSuccess
              ? 'Injection Administration Successfully Recorded'
              : 'Administration Outcome Recorded'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">
                Administration Reference ID
              </span>
              <span className="font-mono font-bold text-slate-900">
                {admin?.referenceCode ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Status</span>
              <Badge variant={isSuccess ? 'default' : 'warning'}>
                {admin?.administrationStatus ?? session.status}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Patient</span>
              <span className="font-semibold">
                {session.patient?.patientName}
              </span>
              <span className="block font-mono text-xs text-slate-500">
                ID: {session.patient?.patientNumber}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">
                Medicine & Batch
              </span>
              <span className="font-semibold">
                {session.package?.medicine.medicineName} (
                {session.package?.medicine.strength})
              </span>
              <span className="block font-mono text-xs text-slate-500">
                Batch: {session.package?.batch.batchNumber}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">
                Administering Nurse
              </span>
              <span className="font-medium">{session.nurse.fullName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Hospital</span>
              <span className="font-medium">{session.hospital.name}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-slate-500 block">
                Recorded Date & Time
              </span>
              <span className="font-medium">
                {new Date(
                  admin?.administeredAt ??
                    admin?.createdAt ??
                    session.completedAt ??
                    session.startedAt,
                ).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {admin && (
              <Button variant="outline" asChild>
                <Link to={`/nurse/history/${admin.id}`}>
                  <Info className="h-4 w-4" />
                  View Administration Details
                </Link>
              </Button>
            )}
            <Button
              disabled={startNewMutation.isPending}
              onClick={() => startNewMutation.mutate()}
            >
              <Syringe className="h-4 w-4" />
              Start New Administration
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/nurse/dashboard">
                <Home className="h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

