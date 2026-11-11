import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDefaultHomeForRole, useAuth } from './auth-context';

export const UnauthorizedPage = () => {
  const { user } = useAuth();
  const target = user ? getDefaultHomeForRole(user.role) : '/login';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
            <ShieldX className="h-6 w-6" />
          </div>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Your role or organization is not authorized to view this page.
          </p>
          <Button asChild>
            <Link to={target}>Return to Workspace</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

