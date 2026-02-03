# Document Upload Feature for Account Type Updates

## Overview
This feature adds document upload functionality when updating account types, specifically when the interest rate is changed. Documents are stored in a structured folder system and their paths are saved in the database.

## Implementation Details

### Backend Changes

#### 1. Database Model (`backend/app/models/account_type.py`)
- Added `document_path` field to `AccountType` model
- Field type: `String(500)`, nullable
- Included in `to_dict()` method for API responses

#### 2. File Storage Utility (`backend/app/utils/file_storage.py`)
- Created utility functions for file handling:
  - `save_account_type_document()`: Saves files to appropriate folder
  - `delete_account_type_document()`: Deletes old documents
  - `get_account_type_folder()`: Maps account type names to folders
  - `ensure_folder_exists()`: Creates folders if they don't exist
  - `delete_existing_file()`: Ensures only one file per folder

**Folder Structure:**
```
backend/
  Documents/
    RD/
    FD/
    DDS/
    Savings/
```

**File Rules:**
- Only one document per folder (replaces existing if present)
- Allowed file types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG
- Files are stored with UUID-based names to prevent conflicts

#### 3. Controller Updates (`backend/app/controllers/account_type_controller.py`)
- Updated `update_account_type()` method to:
  - Check if interest rate changed
  - Require document upload when interest rate changes
  - Handle both JSON and multipart/form-data requests
  - Save uploaded documents using file storage utility
  - Update `document_path` in database

#### 4. Service Updates (`backend/app/services/account_type_service.py`)
- Added `document_path` to enhanced fields list for updates

#### 5. Database Migration (`backend/migrations/versions/a1b2c3d4e5f6_add_document_path_to_accounttype.py`)
- Migration file created to add `document_path` column
- **Note**: Update `down_revision` to match your latest migration ID before running

### Frontend Changes

#### 1. Form Component (`frontend/src/pages/accounts/AccountTypeForm.jsx`)
- Added state variables:
  - `originalInterestRate`: Tracks original interest rate when editing
  - `documentFile`: Stores selected file
- Added document upload field that:
  - Only appears when editing and interest rate changes
  - Shows required indicator
  - Displays selected file name
  - Accepts: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG
- Updated form submission to:
  - Use FormData when document is present
  - Use JSON when no document
  - Validate document requirement when interest rate changes

#### 2. API Client (`frontend/src/services/api.js`)
- Updated request interceptor to:
  - Not set Content-Type header for FormData requests
  - Let browser set Content-Type with boundary automatically

## Usage

### Running Migration
```bash
cd backend
flask db upgrade
```

### Frontend Flow
1. Navigate to `/accounts/types/:id/edit`
2. Change the interest rate field
3. Document upload field appears automatically
4. Select a document file
5. Submit the form
6. Document is uploaded and path saved to database

### Backend API
**Endpoint**: `PUT /api/account-types/:id`

**Request Format** (when document is required):
- Content-Type: `multipart/form-data`
- Fields:
  - All account type fields (as form fields)
  - `document`: File upload

**Response**:
```json
{
  "success": true,
  "message": "Account type updated successfully",
  "data": {
    "id": 15,
    "name": "RD",
    "interest_rate": 6.5,
    "document_path": "Documents/RD/abc123def456.pdf",
    ...
  }
}
```

## Validation Rules

1. **Document Required**: When interest rate changes during edit, document upload is mandatory
2. **File Types**: Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG allowed
3. **One File Per Folder**: Each account type folder can only contain one document (new uploads replace existing)
4. **Folder Mapping**: 
   - RD → Documents/RD/
   - FD → Documents/FD/
   - DDS → Documents/DDS/
   - Savings → Documents/Savings/
   - Other types → Documents/Savings/ (default)

## File Storage

- **Location**: `backend/Documents/{AccountType}/`
- **Naming**: UUID-based filenames (e.g., `a1b2c3d4e5f6.pdf`)
- **Path Storage**: Relative path stored in database (e.g., `Documents/RD/a1b2c3d4e5f6.pdf`)
- **Cleanup**: Old files are automatically deleted when new ones are uploaded

## Error Handling

- Missing document when interest rate changes: Returns 400 error
- Invalid file type: Returns 400 error with allowed types list
- File save errors: Returns 500 error with error message
- Database errors: Returns 500 error, file is not saved

## Testing Checklist

- [ ] Edit account type without changing interest rate (no document required)
- [ ] Edit account type and change interest rate (document required)
- [ ] Upload document with valid file type
- [ ] Try uploading invalid file type (should fail)
- [ ] Upload new document (should replace old one)
- [ ] Verify document is saved in correct folder
- [ ] Verify document_path is saved in database
- [ ] Test with different account types (RD, FD, DDS, Savings)

## Notes

- The Documents folder will be created automatically on first file upload
- Migration must be run before using this feature
- Ensure backend has write permissions for Documents folder
- File paths are relative to backend directory

