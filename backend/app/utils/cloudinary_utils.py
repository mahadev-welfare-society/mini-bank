import uuid
import cloudinary.uploader
from app.utils.file_storage import allowed_file, ALLOWED_EXTENSIONS
import logging

logger = logging.getLogger(__name__)

def save_account_type_document(file, account_type_name):
    """
    Upload account type document to Cloudinary
    """
    try:
        if not file or file.filename == '':
            return False, 'No file provided', None

        if not allowed_file(file.filename):
            return False, f'File type not allowed: {", ".join(ALLOWED_EXTENSIONS)}', None

        folder_path = f"mini-bank/account-types/{account_type_name.upper()}"

        upload_result = cloudinary.uploader.upload(
            file,
            folder=folder_path,
            resource_type="raw",
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            type="upload"  
        )

        data = {
            "cloudinary_url": upload_result.get("secure_url"),        # full URL for frontend
            "cloudinary_public_id": upload_result.get("public_id"),   # required for fetching/deleting
            "original_filename": upload_result.get("original_filename")
        }
        logger.info(f'Document uploaded successfully: {data["cloudinary_public_id"]}')
        return True, "File uploaded successfully", data

    except Exception as e:
        logger.error(f'Error uploading document to Cloudinary: {e}')
        return False, str(e), None
