from flask import request, jsonify, abort, make_response, send_file
from flask_jwt_extended import get_jwt_identity
from app.services.account_type_service import AccountTypeService
from app.utils.cloudinary_utils import save_account_type_document
from app.models import AccountType
from datetime import datetime
import cloudinary
from cloudinary.utils import cloudinary_url
import logging
import json
import os
import time
from datetime import timezone, timedelta

logger = logging.getLogger(__name__)

class AccountTypeController:
    @staticmethod
    def create_account_type():
        """Handle account type creation with enhanced parameters"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            # Validate required fields
            required_fields = ['name','display_name','interest_rate']
            for field in required_fields:
                if not data.get(field):
                    return {
                        'success': False,
                        'message': f'{field} is required',
                        'data': None
                    }, 400
            
            # Extract basic parameters
            name = data['name']
            interest_rate = float(data['interest_rate'])
            term_in_days = data.get('term_in_days')
            display_name= data.get('display_name')
            
            # Extract enhanced parameters
            enhanced_params = {
                'min_deposit': data.get('min_deposit', 0.0),
                'max_deposit': data.get('max_deposit'),
                'min_withdrawal': data.get('min_withdrawal', 0.0),
                'max_withdrawal': data.get('max_withdrawal'),
                'withdrawal_limit_daily': data.get('withdrawal_limit_daily'),
                'withdrawal_limit_monthly': data.get('withdrawal_limit_monthly'),
                'deposit_limit_daily': data.get('deposit_limit_daily'),
                'deposit_limit_monthly': data.get('deposit_limit_monthly'),
                'atm_withdrawal_limit_daily': data.get('atm_withdrawal_limit_daily'),
                'minimum_balance': data.get('minimum_balance', 0.0),
                'low_balance_penalty': data.get('low_balance_penalty', 0.0),
                'interest_calculation_frequency': data.get('interest_calculation_frequency'),
                'interest_calculation_method': data.get('interest_calculation_method', 'simple'),
                'contribution_frequency': data.get('contribution_frequency'),
                'min_contribution_amount': data.get('min_contribution_amount'),
                'lock_in_period_days': data.get('lock_in_period_days'),
                'early_withdrawal_penalty_rate': data.get('early_withdrawal_penalty_rate', 0.0),
                'is_template': data.get('is_template', False),
                'loan_parameters': data.get('loan_parameters')
            }
            
            # Convert numeric fields
            for field in ['min_deposit', 'max_deposit', 'min_withdrawal', 'max_withdrawal', 
                         'withdrawal_limit_daily', 'withdrawal_limit_monthly', 
                         'deposit_limit_daily', 'deposit_limit_monthly', 'atm_withdrawal_limit_daily',
                         'minimum_balance', 'low_balance_penalty', 'min_contribution_amount', 
                         'early_withdrawal_penalty_rate']:
                if enhanced_params[field] is not None:
                    enhanced_params[field] = float(enhanced_params[field])
            
            if enhanced_params['lock_in_period_days'] is not None:
                enhanced_params['lock_in_period_days'] = int(enhanced_params['lock_in_period_days'])
            
            result = AccountTypeService.create_account_type(
                name=name,
                interest_rate=interest_rate,
                term_in_days=term_in_days,
                display_name=display_name,
                created_by=current_user_id,
                **enhanced_params
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in create_account_type controller: {e}')
            return {
                'success': False,
                'message': 'Failed to create account type',
                'data': None
            }, 500
    
    @staticmethod
    def get_account_types():
        """Handle getting all account types"""
        try:
            result = AccountTypeService.get_account_types()
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_account_types controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get account types',
                'data': None
            }, 500
    
    @staticmethod
    def get_account_type(account_type_id):
        """Handle getting a specific account type"""
        try:
            result = AccountTypeService.get_account_type(account_type_id)
            status_code = 200 if result['success'] else 404
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_account_type controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get account type',
                'data': None
            }, 500
    
    @staticmethod
    def update_account_type(account_type_id):
        """Handle updating an account type with enhanced parameters and document upload"""
        try:
            # Get existing account type to check if interest rate changed
            existing_account_type = AccountType.query.get(account_type_id)
            if not existing_account_type:
                return {
                    'success': False,
                    'message': 'Account type not found',
                    'data': None
                }, 404
            
            original_interest_rate = existing_account_type.interest_rate
            
            # Check if request has files (multipart/form-data) or JSON
            if request.files:
                # Handle multipart/form-data (with file upload)
                data = request.form.to_dict()
                file = request.files.get('document')
            else:
                # Handle JSON (no file upload)
                data = request.get_json()
                file = None
            
            # Extract all possible fields from request data
            update_params = {}
            
            # Basic fields
            if 'name' in data:
                update_params['name'] = data['name']
            if 'display_name' in data:
                update_params['display_name'] = data['display_name']
            if 'interest_rate' in data:
                new_interest_rate = float(data['interest_rate'])
                update_params['interest_rate'] = new_interest_rate
                
                # Check if interest rate changed
                interest_rate_changed = abs(new_interest_rate - original_interest_rate) > 0.001
                
                # If interest rate changed, document is required
                if interest_rate_changed:
                    if not file:
                        return {
                            'success': False,
                            'message': 'Document upload is required when interest rate is changed',
                            'data': None
                        }, 400
            else:
                interest_rate_changed = False
            
            if 'term_in_days' in data:
                try:
                    # Convert to int, handle empty strings
                    term_value = data['term_in_days']
                    if term_value is not None:
                        # Handle string values
                        if isinstance(term_value, str):
                            if term_value.strip():
                                update_params['term_in_days'] = int(term_value)
                            else:
                                update_params['term_in_days'] = None
                        # Handle numeric values (int, float)
                        elif isinstance(term_value, (int, float)):
                            update_params['term_in_days'] = int(term_value)
                        else:
                            update_params['term_in_days'] = None
                    else:
                        update_params['term_in_days'] = None
                except (ValueError, TypeError):
                    update_params['term_in_days'] = None
            
            # Enhanced fields
            enhanced_fields = [
                'min_deposit', 'max_deposit', 'min_withdrawal', 'max_withdrawal',
                'withdrawal_limit_daily', 'withdrawal_limit_monthly',
                'deposit_limit_daily', 'deposit_limit_monthly', 'atm_withdrawal_limit_daily',
                'minimum_balance', 'low_balance_penalty', 'interest_calculation_frequency',
                'interest_calculation_method', 'contribution_frequency', 'min_contribution_amount',
                'lock_in_period_days', 'early_withdrawal_penalty_rate', 'loan_parameters'
            ]
            
            for field in enhanced_fields:
                if field in data:
                    value = data[field]
                    # Handle empty strings as None
                    if isinstance(value, str) and not value.strip():
                        update_params[field] = None
                    else:
                        update_params[field] = value
            
            # Convert numeric fields
            numeric_fields = ['min_deposit', 'max_deposit', 'min_withdrawal', 'max_withdrawal', 
                             'withdrawal_limit_daily', 'withdrawal_limit_monthly', 
                             'deposit_limit_daily', 'deposit_limit_monthly', 'atm_withdrawal_limit_daily',
                             'minimum_balance', 'low_balance_penalty', 'min_contribution_amount', 
                             'early_withdrawal_penalty_rate']
            
            for field in numeric_fields:
                if field in update_params and update_params[field] is not None:
                    try:
                        # Handle empty strings
                        if isinstance(update_params[field], str) and not update_params[field].strip():
                            update_params[field] = None
                        else:
                            update_params[field] = float(update_params[field])
                    except (ValueError, TypeError):
                        update_params[field] = None
            
            # Convert lock_in_period_days to int
            if 'lock_in_period_days' in update_params and update_params['lock_in_period_days'] is not None:
                try:
                    if isinstance(update_params['lock_in_period_days'], str) and not update_params['lock_in_period_days'].strip():
                        update_params['lock_in_period_days'] = None
                    else:
                        update_params['lock_in_period_days'] = int(update_params['lock_in_period_days'])
                except (ValueError, TypeError):
                    update_params['lock_in_period_days'] = None
            
            # Parse loan_parameters if it's a JSON string (from FormData)
            if 'loan_parameters' in update_params and update_params['loan_parameters'] is not None:
                if isinstance(update_params['loan_parameters'], str):
                    try:
                        update_params['loan_parameters'] = json.loads(update_params['loan_parameters'])
                    except (json.JSONDecodeError, TypeError):
                        update_params['loan_parameters'] = None
            
            # Handle file upload if provided (when interest rate changes)
            if file and interest_rate_changed:
                # Get account type name (use existing or updated name)
                account_type_name = update_params.get('name', existing_account_type.name)
                
                # Save document
                success, message, document_data = save_account_type_document(file, account_type_name)
                
                document_path = document_data['cloudinary_url']           # For frontend download/view
                public_id = document_data['cloudinary_public_id']     # For deletion if needed

                if not success:
                    return {
                        'success': False,
                        'message': message,
                        'data': None
                    }, 400
                
                # Get existing document history
                existing_history = existing_account_type.get_document_history()
                
                # Get current IST time (UTC+5:30)
                ist_timezone = timezone(timedelta(hours=5, minutes=30))
                ist_now = datetime.now(ist_timezone)
                
                # Create new history entry
                new_entry = {
                    'previous_rate': float(original_interest_rate),
                    'current_rate': float(new_interest_rate),
                    'file_path': document_path,
                    'public_id': public_id,
                    'date': ist_now.isoformat()
                }
                
                # Append to history
                existing_history.append(new_entry)
                
                # Store updated history as JSON string
                update_params['document_path'] = json.dumps(existing_history)
            
            result = AccountTypeService.update_account_type(
                account_type_id=account_type_id,
                **update_params
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in update_account_type controller: {e}')
            return {
                'success': False,
                'message': 'Failed to update account type',
                'data': None
            }, 500
    
    @staticmethod
    def delete_account_type(account_type_id):
        """Handle deactivating an account type"""
        try:
            result = AccountTypeService.deactivate_account_type(account_type_id)
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in delete_account_type controller: {e}')
            return {
                'success': False,
                'message': 'Failed to delete account type',
                'data': None
            }, 500
     
    @staticmethod
    def validate_transaction():
        """Handle transaction validation"""
        try:
            data = request.get_json()
            account_type_id = data.get('account_type_id')
            transaction_type = data.get('transaction_type')
            amount = data.get('amount')
            
            if not all([account_type_id, transaction_type, amount]):
                return {
                    'success': False,
                    'message': 'account_type_id, transaction_type, and amount are required',
                    'data': None
                }, 400
            
            result = AccountTypeService.validate_transaction(
                account_type_id=int(account_type_id),
                transaction_type=transaction_type,
                amount=float(amount)
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in validate_transaction controller: {e}')
            return {
                'success': False,
                'message': 'Failed to validate transaction',
                'data': None
            }, 500
    
    @staticmethod
    def calculate_maturity():
        """Handle maturity amount calculation"""
        try:
            data = request.get_json()
            account_type_id = data.get('account_type_id')
            principal = data.get('principal')
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            
            if not all([account_type_id, principal, start_date]):
                return {
                    'success': False,
                    'message': 'account_type_id, principal, and start_date are required',
                    'data': None
                }, 400
            
            result = AccountTypeService.calculate_maturity_amount(
                account_type_id=int(account_type_id),
                principal=float(principal),
                start_date=start_date,
                end_date=end_date
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in calculate_maturity controller: {e}')
            return {
                'success': False,
                'message': 'Failed to calculate maturity amount',
                'data': None
            }, 500
    
    @staticmethod
    def get_interest_history(account_type_id):
        """Get interest rate change history for an account type"""
        try:
            account_type = AccountType.query.get(account_type_id)
            
            if not account_type:
                return {
                    'success': False,
                    'message': 'Account type not found',
                    'data': None
                }, 404
            
            # Get document history
            history = account_type.get_document_history()
            
            # Build response with file URLs
            history_with_urls = []
            for entry in history:
                history_entry = {
                    'previous_rate': entry.get('previous_rate'),
                    'current_rate': entry.get('current_rate'),
                    'date': entry.get('date'),
                    'file_path': entry.get('file_path'),
                    'file_url': f'/api/account-types/document/{entry.get("file_path")}' if entry.get('file_path') else None
                }
                history_with_urls.append(history_entry)
            
            return {
                'success': True,
                'message': 'Interest history retrieved successfully',
                'data': {
                    'account_type_id': account_type.id,
                    'account_type_name': account_type.name,
                    'display_name': account_type.display_name,
                    'current_interest_rate': account_type.interest_rate,
                    'history': history_with_urls
                }
            }, 200
            
        except Exception as e:
            logger.error(f'Error in get_interest_history controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get interest history',
                'data': None
            }, 500
    
    @staticmethod
    def get_document():
        """
        Get document URL from Cloudinary.
        All files are now stored in Cloudinary only.
        """
        data = request.get_json(silent=True) or {}
        file_path = data.get('file_path')
        public_id = data.get('public_id')
        
        # If file_path is provided and it's a Cloudinary URL
        if file_path and file_path.startswith('https://'):
            # Return the Cloudinary URL directly (no need to generate signed URL for public files)
            # If you need signed URLs for private files, uncomment the code below
            return jsonify({
                'success': True,
                'file_url': file_path
            })
            
            # Uncomment below if you need signed URLs for private Cloudinary files:
            # try:
            #     # Extract public_id from Cloudinary URL
            #     # URL format: https://res.cloudinary.com/{cloud_name}/raw/upload/{version}/{public_id}
            #     parts = file_path.split('/raw/upload/')
            #     if len(parts) > 1:
            #         path_part = parts[1]
            #         if '/' in path_part:
            #             public_id = path_part.split('/', 1)[1]
            #         else:
            #             public_id = path_part
            #     else:
            #         parts = file_path.split('/upload/')
            #         if len(parts) > 1:
            #             path_part = parts[1]
            #             if '/' in path_part:
            #                 public_id = path_part.split('/', 1)[1]
            #             else:
            #                 public_id = path_part
            #     
            #     if public_id:
            #         cloud_url, options = cloudinary_url(
            #             public_id,
            #             resource_type='raw',
            #             type='upload',
            #             sign_url=True,
            #             expires_at=int(time.time()) + 600,
            #             secure=True
            #         )
            #         return jsonify({
            #             'success': True,
            #             'file_url': cloud_url
            #         })
            # except Exception as e:
            #     logger.error(f'Error processing Cloudinary URL: {e}')
            #     return jsonify({
            #         'success': True,
            #         'file_url': file_path
            #     })
        
        # If public_id is provided directly
        if public_id:
            try:
                # Generate signed URL valid for, e.g., 10 minutes
                cloud_url, options = cloudinary_url(
                    public_id,
                    resource_type='raw',
                    type='upload',
                    sign_url=True,
                    expires_at=int(time.time()) + 600,  # 10 minutes from now
                    secure=True
                )
                return jsonify({
                    'success': True,
                    'file_url': cloud_url
                })
            except Exception as e:
                logger.error(f'Error generating Cloudinary URL: {e}')
                abort(500, f'Error generating document URL: {str(e)}')
        
        # Legacy support: if file_path is provided but not a Cloudinary URL
        # This should not happen in new uploads, but handle gracefully
        if file_path and not file_path.startswith('https://'):
            logger.warning(f'Legacy local file path detected: {file_path}')
            abort(404, 'File not found. All files are now stored in Cloudinary.')
        
        abort(400, 'Either file_path (Cloudinary URL) or public_id is required')

    @staticmethod
    def handle_options():
        """Handle CORS preflight OPTIONS request"""
        response = make_response()
        origin = request.headers.get('Origin')
        if origin:
            allowed_origins = [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:5173',
                'http://localhost:3001',
                'https://mini-bank-project.vercel.app'
            ]
            
            is_allowed = (
                origin in allowed_origins or
                origin.startswith('http://localhost:') or
                origin.startswith('http://127.0.0.1:') or
                'vercel.app' in origin
            )
            
            if is_allowed:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With,Accept,Origin'
                response.headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS'
                response.headers['Access-Control-Max-Age'] = '3600'
        return response