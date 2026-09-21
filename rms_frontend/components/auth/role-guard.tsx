'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { UserRole, hasRole } from '@/lib/permissions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RoleGuardProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
    const { user, role, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    const isAuthorized = hasRole(role, allowedRoles) || user?.is_superuser;

    if (isAuthorized) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border border-border bg-card shadow-sm">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Access Restricted</h2>
                    <p className="text-sm text-muted-foreground">
                        Your account role (<span className="font-semibold capitalize text-foreground">{role || 'staff'}</span>) does not have permission to view or manage this section.
                    </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Return to Dashboard
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default RoleGuard;
