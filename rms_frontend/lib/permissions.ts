import { UserRole } from './api/auth';

export type { UserRole };

export interface PermissionRule {
    roles: UserRole[];
    exact?: boolean;
}

// Route permission definitions
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
    '/pos': ['admin', 'manager', 'cashier'],
    '/sales': ['admin', 'manager', 'cashier', 'accountant'],
    '/sales/sales-history': ['admin', 'manager', 'cashier', 'accountant'],
    '/sales/due': ['admin', 'manager', 'cashier', 'accountant'],
    '/sales/returns': ['admin', 'manager', 'cashier'],
    '/inventory': ['admin', 'manager', 'inventory'],
    '/inventory/products': ['admin', 'manager', 'inventory'],
    '/inventory/categories': ['admin', 'manager', 'inventory'],
    '/inventory/alerts': ['admin', 'manager', 'inventory'],
    '/customers': ['admin', 'manager', 'cashier'],
    '/suppliers': ['admin', 'manager', 'inventory'],
    '/expenses': ['admin', 'manager', 'accountant'],
    '/reports': ['admin', 'manager', 'accountant'],
    '/preorders': ['admin', 'manager', 'cashier'],
    '/online-preorders': ['admin', 'manager', 'cashier', 'courier'],
    '/settings': ['admin'],
    '/ecommerce-settings': ['admin', 'manager'],
    '/activity-log': ['admin', 'manager'],
    '/': ['admin', 'manager', 'cashier', 'inventory', 'accountant', 'courier'], // Dashboard open to staff
};

/**
 * Checks if a given role is authorized to access a route pathname
 */
export function hasRouteAccess(role: UserRole | string | undefined | null, pathname: string): boolean {
    if (!role) return false;
    const normalizedRole = role.toLowerCase() as UserRole;
    if (normalizedRole === 'admin') return true; // Admins have global access

    // Check exact matches first
    if (ROUTE_PERMISSIONS[pathname]) {
        return ROUTE_PERMISSIONS[pathname].includes(normalizedRole);
    }

    // Match parent route prefixes (e.g. /inventory/products matches /inventory)
    const matchingRoute = Object.keys(ROUTE_PERMISSIONS)
        .filter((route) => route !== '/')
        .find((route) => pathname.startsWith(route));

    if (matchingRoute) {
        return ROUTE_PERMISSIONS[matchingRoute].includes(normalizedRole);
    }

    // Default: permit general routes
    return true;
}

/**
 * Checks if the user's role is included in allowed roles
 */
export function hasRole(userRole: string | undefined | null, allowedRoles: UserRole[]): boolean {
    if (!userRole) return false;
    const normalized = userRole.toLowerCase() as UserRole;
    if (normalized === 'admin') return true;
    return allowedRoles.includes(normalized);
}

/**
 * Return display styling and friendly label for a user's role badge
 */
export function getRoleBadge(role: string | undefined | null): { label: string; className: string } {
    switch (role?.toLowerCase()) {
        case 'admin':
            return { label: 'Admin', className: 'bg-rose-500/10 text-rose-600 border-rose-200' };
        case 'manager':
            return { label: 'Manager', className: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' };
        case 'cashier':
            return { label: 'Cashier', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
        case 'inventory':
            return { label: 'Inventory', className: 'bg-amber-500/10 text-amber-600 border-amber-200' };
        case 'accountant':
            return { label: 'Accountant', className: 'bg-sky-500/10 text-sky-600 border-sky-200' };
        case 'courier':
            return { label: 'Courier', className: 'bg-purple-500/10 text-purple-600 border-purple-200' };
        default:
            return { label: role || 'Staff', className: 'bg-slate-500/10 text-slate-600 border-slate-200' };
    }
}
