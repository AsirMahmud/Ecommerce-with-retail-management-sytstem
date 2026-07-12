import os
import sys
import django
from pathlib import Path
from dotenv import load_dotenv

# 1. Setup base directory and load .env robustly
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / '.env'
print(f"Loading environment variables from: {env_path}")
load_dotenv(env_path)

# 2. Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rms.settings')
django.setup()

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from apps.ecommerce.models import HomePageSettings
from apps.online_preorder.models import OnlinePreorder
from apps.online_preorder.email_utils import send_admin_order_notification, send_customer_order_received

# 3. Print current Django email settings (without exposing password)
print("\n--- Current Email Settings Configuration ---")
print(f"EMAIL_BACKEND:       {settings.EMAIL_BACKEND}")
print(f"EMAIL_HOST:          {settings.EMAIL_HOST}")
print(f"EMAIL_PORT:          {settings.EMAIL_PORT}")
print(f"EMAIL_USE_TLS:       {settings.EMAIL_USE_TLS}")
print(f"EMAIL_USE_SSL:       {getattr(settings, 'EMAIL_USE_SSL', False)}")
print(f"EMAIL_HOST_USER:     {settings.EMAIL_HOST_USER}")
print(f"DEFAULT_FROM_EMAIL:  {settings.DEFAULT_FROM_EMAIL}")

password = settings.EMAIL_HOST_PASSWORD
if password:
    masked = password[:2] + '*' * (len(password) - 4) + password[-2:] if len(password) > 4 else '****'
    print(f"EMAIL_HOST_PASSWORD: {masked} (length: {len(password)})")
else:
    print("EMAIL_HOST_PASSWORD: NOT SET (is None or Empty)")
print("--------------------------------------------\n")

if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
    print("[ERROR] EMAIL_HOST_USER or EMAIL_HOST_PASSWORD is not set in the environment variables.")
    print("Please make sure these variables are defined in your .env file or your server configuration.")
    sys.exit(1)

# 4. Get recipient email
test_recipient = None
if len(sys.argv) > 1:
    test_recipient = sys.argv[1]
    print(f"Using CLI argument for recipient: {test_recipient}")
else:
    # Try using host user as recipient if no arg provided
    test_recipient = settings.EMAIL_HOST_USER
    print(f"No recipient email provided as argument. Defaulting to host user: {test_recipient}")
    print("Hint: You can run 'python test_email.py recipient@example.com' to test with any other email address.")

# 5. Fetch or create a test preorder
print("\nRetrieving order for testing...")
order = OnlinePreorder.objects.all().order_by('-id').first()
if not order:
    print("No existing preorders found in database. Creating a temporary dummy order...")
    order = OnlinePreorder.objects.create(
        customer_name="Test Customer",
        customer_phone="01711111111",
        customer_email=test_recipient,
        items=[
            {
                "product_id": 1,
                "product_name": "Premium Cotton Polo",
                "quantity": 2,
                "unit_price": 750,
                "color": "Navy Blue",
                "size": "L"
            }
        ],
        shipping_address={
            "address": "123 Test Street",
            "city": "Dhaka",
            "area": "Gulshan"
        },
        delivery_charge=80,
        total_amount=1580,
        status="PENDING"
    )
    print(f"Temporary dummy order created with ID: {order.id}")
else:
    print(f"Found order ID: {order.id} for {order.customer_name}")
    # Temporarily update customer_email for test purposes
    if order.customer_email != test_recipient:
        print(f"Updating order customer email from '{order.customer_email}' to '{test_recipient}' for testing.")
        order.customer_email = test_recipient
        order.save(update_fields=['customer_email'])

# 6. Run actual template rendering and sending
print(f"\n--- Testing Email Sending Flow (Recipient: {test_recipient}) ---")

# Load settings for contact info
try:
    home_settings = HomePageSettings.load()
    admin_email = home_settings.footer_email or settings.DEFAULT_FROM_EMAIL
    support_email = home_settings.footer_email or "support@rawstitch.info"
except Exception as e:
    print(f"[Warning] Failed to load HomePageSettings: {e}. Falling back to default settings.")
    admin_email = settings.DEFAULT_FROM_EMAIL
    support_email = "support@rawstitch.info"

# Context
context = {
    'order_id': order.id,
    'customer_name': order.customer_name,
    'customer_phone': order.customer_phone,
    'date': order.created_at.strftime('%Y-%m-%d %H:%M') if order.created_at else '2026-07-07 18:00',
    'items': order.items,
    'subtotal': float(order.total_amount) - float(order.delivery_charge),
    'delivery_charge': order.delivery_charge,
    'total_amount': order.total_amount,
    'shipping_address': order.shipping_address or {},
    'support_email': support_email,
    'item_count': len(order.items),
    'admin_url': f"https://rawstitch.info/admin/online-orders/{order.id}"
}

success = True

# A. Admin Alert Email
print("\n1. Testing 'Admin New Order Alert' template and SMTP send...")
try:
    html_content_admin = render_to_string('emails/admin_new_order_alert.html', context)
    text_content_admin = strip_tags(html_content_admin)
    msg_admin = EmailMultiAlternatives(
        subject=f"NEW ORDER RECEIVED: # {order.id}",
        body=text_content_admin,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[admin_email]
    )
    msg_admin.attach_alternative(html_content_admin, "text/html")
    msg_admin.send()
    print(f"   [SUCCESS] Admin notification email sent successfully to: {admin_email}")
except Exception as e:
    print(f"   [FAILED] Admin notification email failed: {e}")
    import traceback
    traceback.print_exc()
    success = False

# B. Customer Order Received Email
print("\n2. Testing 'Customer Order Received' template and SMTP send...")
try:
    html_content = render_to_string('emails/customer_order_received.html', context)
    text_content = strip_tags(html_content)
    msg = EmailMultiAlternatives(
        subject=f"Order Received # {order.id} - Raw Stitch",
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[order.customer_email]
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()
    print(f"   [SUCCESS] Customer 'Order Received' email sent successfully to: {order.customer_email}")
except Exception as e:
    print(f"   [FAILED] Customer 'Order Received' email failed: {e}")
    import traceback
    traceback.print_exc()
    success = False

print("\n--- Diagnostic Results Summary ---")
if success:
    print("[SUCCESS] ALL TESTS PASSED! Local Django SMTP connection is working perfectly.")
    print("If users are not receiving emails in production, please verify that:")
    print("1. Your production .env file contains the same valid EMAIL_HOST_USER and EMAIL_HOST_PASSWORD.")
    print("2. The production server (cPanel/Hostinger/etc.) allows outbound connections on SMTP Port 587.")
    print("   (Many shared hosts block Port 587 by default to prevent spam. You may need to request them to unblock it.)")
    print("3. Check your Spam folder in your email inbox.")
else:
    print("[FAILED] EMAIL TEST FAILED.")

    print("Common solutions based on the errors above:")
    print("- 'SMTPAuthenticationError': Double-check your EMAIL_HOST_USER and EMAIL_HOST_PASSWORD.")
    print("  Note: If using Gmail, you must use a 16-character 'App Password' generated from Google Account Security, not your regular password.")
    print("- 'ConnectionTimeout' / 'ConnectionRefusedError': Port 587 is likely blocked by your hosting provider.")
    print("  Contact support to open Port 587 for outgoing mail, or try using Port 465 with SSL instead.")
