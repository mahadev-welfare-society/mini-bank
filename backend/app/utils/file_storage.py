import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app
import logging

logger = logging.getLogger(__name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_documents_base_path():
    """Get the base path for Documents folder"""
    # Get the base directory (backend folder)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    documents_path = os.path.join(base_dir, 'Documents')
    return documents_path

def get_account_type_folder(account_type_name):
    """Get the folder path for a specific account type"""
    # Map account type names to folder names
    folder_mapping = {
        'RD': 'RD',
        'FD': 'FD',
        'DDS': 'DDS',
        'Savings': 'Savings'
    }
    
    # Get the folder name (default to Savings if not found)
    folder_name = folder_mapping.get(account_type_name, 'Savings')
    
    # Create full path
    base_path = get_documents_base_path()
    folder_path = os.path.join(base_path, folder_name)
    
    return folder_path, folder_name

def ensure_folder_exists(folder_path):
    """Ensure the folder exists, create if it doesn't"""
    if not os.path.exists(folder_path):
        os.makedirs(folder_path, exist_ok=True)
        logger.info(f'Created folder: {folder_path}')

def delete_account_type_document(document_path):
    """
    Delete account type document
    
    Args:
        document_path: Relative path to document (e.g., 'Documents/RD/filename.pdf')
    
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        if not document_path:
            return True, 'No document to delete'
        
        # Get full path
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        full_path = os.path.join(base_dir, document_path)
        
        # Check if file exists
        if os.path.exists(full_path) and os.path.isfile(full_path):
            os.remove(full_path)
            logger.info(f'Deleted document: {full_path}')
            return True, 'Document deleted successfully'
        else:
            return False, 'Document not found'
            
    except Exception as e:
        logger.error(f'Error deleting document: {e}')
        return False, f'Error deleting document: {str(e)}'

