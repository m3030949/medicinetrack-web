import { useQuery } from '@tanstack/react-query';
import { FileSearch } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';

interface AuditRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { email: string; fullName: string; role: string } | null;
}

interface AuditResponse {
  items: AuditRow[];
  meta: { total: number; page: number; totalPages: number };
}

export function AuditLogsPage() {
  const [page, setPage] = React.useState(1);
  const [actionFilter, setActionFilter] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: async () => {
      const res = await apiClient.get<AuditResponse>('/audit-logs', {
        params: {
          page,
          limit: 20,
          action: actionFilter || undefined,
        },
      });
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500">
            Immutable security and compliance trail scoped to your authorized
            view.
          </p>
        </div>

        <Input
          className="w-64"
          placeholder="Filter by action (e.g. AUTH_)"
          value={actionFilter}
          onChange={(e) => {
            setPage(1);
            setActionFilter(e.target.value);
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4 text-teal-700" />
            Event Stream ({data?.meta.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading audit events...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {row.resourceType}
                      {row.resourceId ? `:${row.resourceId.slice(0, 8)}` : ''}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.actor ? (
                        <div>
                          {row.actor.fullName}
                          <div className="text-xs text-slate-500">
                            {row.actor.email}
                          </div>
                        </div>
                      ) : (
                        'System'
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {row.ipAddress ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {data?.meta.page ?? 1} of{' '}
              {Math.max(1, data?.meta.totalPages ?? 1)}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data || page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

