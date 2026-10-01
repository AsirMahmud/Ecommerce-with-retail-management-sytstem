#!/usr/bin/env python3
"""
URGENT FIX for Production Media Directory Issue
Run this on your production server to fix the permission error immediately.
"""

import os
import stat
import subprocess
import sys

def fix_production_media():
    """Fix the media directory issue on production server"""
    
    print("🔧 Fixing Production Media Directory Issue...")
    print("=" * 50)
    
    # Production media path
    media_root = '/home/rawstitc/public_html/media'
    
    try:
        # Step 1: Create the main media directory
        print(f"📁 Creating media directory: {media_root}")
        os.makedirs(media_root, exist_ok=True)
        
        # Step 2: Set proper permissions (755)
        print(f"🔐 Setting permissions for: {media_root}")
        os.chmod(media_root, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
        
        # Step 3: Create subdirectories
        subdirs = ['products', 'categories', 'users', 'temp', 'uploads', 'hero_slides', 'promo_modals', 'gallery', 'brands', 'site_logo', 'hero']
        for subdir in subdirs:
            subdir_path = os.path.join(media_root, subdir)
            print(f"📁 Creating subdirectory: {subdir}")
            os.makedirs(subdir_path, exist_ok=True)
            os.chmod(subdir_path, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
        
        # Step 4: Set ownership (if possible)
        try:
            print("👤 Setting ownership to rawstitc:rawstitc")
            subprocess.run(['chown', '-R', 'rawstitc:rawstitc', media_root], check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("⚠️  Could not set ownership (may need sudo)")
            print("   Run manually: sudo chown -R rawstitc:rawstitc /home/rawstitc/public_html/media")
        
        # Step 5: Verify the setup
        print("\n✅ Verification:")
        if os.path.exists(media_root):
            print(f"✅ Media directory exists: {media_root}")
            print(f"✅ Permissions: {oct(os.stat(media_root).st_mode)[-3:]}")
            
            # List subdirectories
            subdirs_created = [d for d in os.listdir(media_root) if os.path.isdir(os.path.join(media_root, d))]
            print(f"✅ Subdirectories created: {', '.join(subdirs_created)}")
        
        print("\n🎉 PRODUCTION MEDIA FIX COMPLETED!")
        print("Your Django application should now be able to upload files.")
        print("\nNext steps:")
        print("1. Restart your Django application")
        print("2. Test file upload through your API")
        
    except PermissionError as e:
        print(f"❌ PERMISSION ERROR: {e}")
        print("\n🔧 MANUAL FIX REQUIRED:")
        print("Run these commands on your production server:")
        print(f"sudo mkdir -p {media_root}")
        print(f"sudo chmod 755 {media_root}")
        print(f"sudo chown -R rawstitc:rawstitc {media_root}")
        print(f"sudo mkdir -p {media_root}/products")
        print(f"sudo mkdir -p {media_root}/categories")
        print(f"sudo mkdir -p {media_root}/users")
        print(f"sudo mkdir -p {media_root}/temp")
        print(f"sudo chmod 755 {media_root}/*")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        print("\n🔧 ALTERNATIVE FIX:")
        print("Contact your hosting provider to:")
        print("1. Create the directory: /home/rawstitc/public_html/media")
        print("2. Set permissions to 755")
        print("3. Set ownership to rawstitc:rawstitc")

if __name__ == "__main__":
    fix_production_media()















