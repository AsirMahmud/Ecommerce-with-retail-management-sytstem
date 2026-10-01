#!/usr/bin/env python3
"""
Script to set up media directory with proper permissions on production server.
Run this script on your production server to create the media directory.
"""

import os
import stat

def setup_media_directory():
    """Create media directory with proper permissions"""
    media_root = '/home/rawstitc/public_html/media'
    
    try:
        # Create the media directory if it doesn't exist
        os.makedirs(media_root, exist_ok=True)
        
        # Set proper permissions (755 for directories)
        os.chmod(media_root, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
        
        print(f"✅ Media directory created successfully: {media_root}")
        print(f"✅ Permissions set to 755")
        
        # Create subdirectories for different file types
        subdirs = ['products', 'categories', 'users', 'temp', 'hero_slides', 'promo_modals', 'gallery', 'brands', 'site_logo', 'hero', 'uploads']
        for subdir in subdirs:
            subdir_path = os.path.join(media_root, subdir)
            os.makedirs(subdir_path, exist_ok=True)
            os.chmod(subdir_path, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
            print(f"✅ Created subdirectory: {subdir_path}")
        
        print("\n🎉 Media directory setup completed successfully!")
        print("Your Django application should now be able to upload files.")
        
    except PermissionError as e:
        print(f"❌ Permission denied: {e}")
        print("Please run this script with appropriate permissions or contact your system administrator.")
        print("\nManual setup instructions:")
        print(f"1. Create directory: mkdir -p {media_root}")
        print(f"2. Set permissions: chmod 755 {media_root}")
        print(f"3. Set ownership: chown -R rawstitc:rawstitc {media_root}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    setup_media_directory()
















