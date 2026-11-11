import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import * as React from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient, extractApiError } from '@/lib/api-client';

interface ConfigRow {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

export function SystemConfigPage() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const res = await apiClient.get<ConfigRow[]>('/system/config');
      return res.data;
    },
  });

  React.useEffect(() => {
    const initial: Record<string, string> = {};
    for (const c of configs) {
      initial[c.key] = JSON.stringify(c.value);
    }
    setDrafts(initial);
  }, [configs]);

  const updateMutation = useMutation({
    mutationFn: async ({ key, rawValue }: { key: string; rawValue: string }) => {
      const parsed = JSON.parse(rawValue) as unknown;
      return apiClient.patch(`/system/config/${key}`, { value: parsed });
    },
    onSuccess: (_res, vars) => {
      setFeedback(`Updated configuration "${vars.key}".`);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['system-config'] });
    },
    onError: (err) => setError(extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          System Configuration
        </h1>
        <p className="text-sm text-slate-500">
          Platform-wide session TTL, lockout, and MFA policies.
        </p>
      </div>

      {feedback && <Alert variant="success">{feedback}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-teal-700" />
            Policy Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading configuration...</p>
          ) : (
            configs.map((cfg) => (
              <div
                key={cfg.key}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="font-mono text-sm font-semibold text-slate-900">
                    {cfg.key}
                  </div>
                  <div className="text-xs text-slate-500">
                    {cfg.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-56 font-mono text-xs"
                    value={drafts[cfg.key] ?? ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [cfg.key]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      updateMutation.mutate({
                        key: cfg.key,
                        rawValue: drafts[cfg.key] ?? 'null',
                      })
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

