from rest_framework.permissions import BasePermission

class HasRole(BasePermission):
    """
    Factory-style or parameterized permission checker for roles.
    Usage:
        permission_classes = [HasRole(['admin', 'manager'])]
    """
    def __init__(self, allowed_roles=None):
        self.allowed_roles = allowed_roles or []

    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        user_role = getattr(request.user, 'role', 'cashier')
        return user_role in self.allowed_roles

class IsAdminUserRole(BasePermission):
    """Allows access only to Admin users or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or getattr(request.user, 'role', None) == 'admin')
        )

class IsManagerOrAdmin(BasePermission):
    """Allows access to Managers, Admins, or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or getattr(request.user, 'role', None) in ['admin', 'manager'])
        )

class IsCashierOrAbove(BasePermission):
    """Allows access to Cashiers, Managers, Admins, or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or getattr(request.user, 'role', None) in ['admin', 'manager', 'cashier'])
        )

class IsInventoryStaffOrAbove(BasePermission):
    """Allows access to Inventory Staff, Managers, Admins, or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or getattr(request.user, 'role', None) in ['admin', 'manager', 'inventory'])
        )

class IsAccountantOrAbove(BasePermission):
    """Allows access to Accountants, Managers, Admins, or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or getattr(request.user, 'role', None) in ['admin', 'manager', 'accountant'])
        )
