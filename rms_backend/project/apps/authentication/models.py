from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('cashier', 'Cashier'),
        ('inventory', 'Inventory Staff'),
        ('accountant', 'Accountant'),
        ('courier', 'Courier Staff'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

