import os
import sys
import logging
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile, UploadedFile

logger = logging.getLogger(__name__)

def optimize_image(image_field, max_width=1920, max_height=1920):
    """
    Optimizes the uploaded image:
    1. Resizes it if it exceeds max dimensions (maintaining aspect ratio).
    2. Converts it to WebP format.
    3. Handles CMYK/Palette mode conversions safely.
    4. Silently falls back to original image on any conversion error.
    """
    # Only process if it's a new upload (UploadedFile)
    # Existing files are FieldFile and shouldn't be re-processed
    if not image_field or not hasattr(image_field, 'file') or not isinstance(image_field.file, UploadedFile):
        return

    try:
        # Open the image using Pillow
        img = Image.open(image_field)

        # Convert CMYK / Palette / Grayscale to RGBA or RGB for WebP compatibility
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in getattr(img, 'info', {})):
            img = img.convert('RGBA')
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Check if image needs resizing
        if img.height > max_height or img.width > max_width:
            resample_filter = getattr(getattr(Image, 'Resampling', Image), 'LANCZOS', Image.ANTIALIAS if hasattr(Image, 'ANTIALIAS') else None)
            if resample_filter:
                img.thumbnail((max_width, max_height), resample_filter)
            else:
                img.thumbnail((max_width, max_height))

        # Prepare for saving
        output = BytesIO()

        # Save as WebP
        img.save(output, format='WEBP', quality=85, optimize=True)
        output.seek(0)

        # Change the file extension
        new_name = os.path.splitext(image_field.name)[0] + '.webp'
        file_size = output.getbuffer().nbytes

        # Create a new Django File object
        image_field.file = InMemoryUploadedFile(
            output,
            'ImageField',
            new_name,
            'image/webp',
            file_size,
            None
        )
        image_field.name = new_name
    except Exception as e:
        logger.warning(f"optimize_image failed for {getattr(image_field, 'name', 'unknown')}: {e}. Keeping original image.")
        return
