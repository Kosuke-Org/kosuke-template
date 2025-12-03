'use client';

import Link from 'next/link';

import { Building2, Users } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { data: usersData, isLoading: isLoadingUsers } = trpc.admin.users.list.useQuery({
    page: 1,
    pageSize: 1,
  });

  const { data: orgsData, isLoading: isLoadingOrgs } = trpc.admin.organizations.list.useQuery({
    page: 1,
    pageSize: 1,
  });

  // const { data: queuesData, isLoading: isLoadingQueues } = trpc.admin.jobs.listQueues.useQuery();

  const isLoading = isLoadingUsers || isLoadingOrgs;

  // const totalFailedJobs = queuesData?.reduce((acc, queue) => acc + queue.counts.failed, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Super admin control panel</p>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/users">
            <Card className="gap-2 py-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="text-muted-foreground h-4 w-4" />
                  <span>Users</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usersData?.total ?? 0}</div>
                <p className="text-muted-foreground mt-2 text-xs">Click to manage users</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/organizations">
            <Card className="gap-2 py-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="text-muted-foreground h-4 w-4" />
                  <span>Organizations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orgsData?.total ?? 0}</div>
                <p className="text-muted-foreground mt-2 text-xs">Click to manage organizations</p>
              </CardContent>
            </Card>
          </Link>

          {/* <Link href="/admin/jobs">
            <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
                <Activity className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-destructive text-2xl font-bold">{totalFailedJobs}</div>
                <p className="text-muted-foreground text-xs">Click to manage queues</p>
              </CardContent>
            </Card>
          </Link> */}
        </div>
      )}
    </div>
  );
}
