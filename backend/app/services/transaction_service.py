from app import db
from app.models import Transaction, Account, AccountType, Customer, User, TransactionEditRequest
from datetime import datetime, timedelta
import logging
import threading

logger = logging.getLogger(__name__)

class TransactionService:
    @staticmethod
    def create_transaction(account_id, transaction_type, amount, description, created_by, reference_number=None, payment_type=None):
        """Create a new transaction and update account balance"""
        try:
            # Get account
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Validate account is active
            if account.status != 'active':
                return {
                    'success': False,
                    'message': 'Account is not active',
                    'data': None
                }
            
            # Validate transaction based on account's snapshot/custom values
            is_valid, validation_message = account.validate_transaction(
                transaction_type, amount
            )
            
            if not is_valid:
                return {
                    'success': False,
                    'message': validation_message,
                    'data': None
                }
            
            # Calculate balance changes
            balance_before = account.balance
            
            # Check if this is a loan account
            is_loan_account = account.account_type and account.account_type.name == 'Loan'
            
            if transaction_type in ['deposit', 'interest', 'loan_disbursal']:
                balance_after = balance_before + amount
            elif transaction_type == 'loan_repayment':
                # For loans, balance is negative (outstanding amount)
                # Repayment adds to the balance to reduce the negative value
                # Example: -1000 + 500 = -500 (reduced outstanding)
                balance_after = balance_before + amount
            elif transaction_type in ['withdrawal', 'penalty']:
                balance_after = balance_before - amount
            else:
                return {
                    'success': False,
                    'message': 'Invalid transaction type',
                    'data': None
                }
            
            # Special handling for RD accounts: Set start_date on first deposit
            if account.account_type and account.account_type.name == 'RD' and transaction_type == 'deposit':
                # Check if this is the first deposit (balance was 0 before this transaction)
                if balance_before == 0:
                    today = datetime.now().date()
                    account.start_date = today
                    logger.info(f'Setting RD account {account_id} start_date to {today} (first deposit)')
                    
                    # Recalculate maturity date based on term_in_days
                    if account.account_type.term_in_days:
                        account.maturity_date = today + timedelta(days=account.account_type.term_in_days)
                        logger.info(f'RD account {account_id} maturity_date set to {account.maturity_date}')
            
            # Special handling for Loan accounts: Update last_payment_date on repayment
            if account.account_type and account.account_type.name == 'Loan' and transaction_type == 'loan_repayment':
                today = datetime.now().date()
                account.last_payment_date = today
                logger.info(f'Updated last_payment_date for loan account {account_id} to {today}')
            
            # Generate reference number if not provided
            if not reference_number:
                reference_number = Transaction.generate_reference_number()
            
            # Determine creator type
            creator_type = 'user'
            if Customer.query.get(created_by):
                creator_type = 'customer'
            elif User.query.get(created_by):
                creator_type = 'user'
            
            # Create transaction
            transaction = Transaction(
                account_id=account_id,
                transaction_type=transaction_type,
                amount=amount,
                balance_before=balance_before,
                balance_after=balance_after,
                description=description,
                reference_number=reference_number,
                status='completed',
                created_by=created_by,
                creator_type=creator_type,
                payment_type=payment_type
            )
            
            # Update account balance
            account.balance = balance_after
            account.updated_at = datetime.utcnow()
            
            db.session.add(transaction)
            db.session.flush()  # Flush to get transaction.id
            
            # Mark EMI installment as paid for loan repayments
            if account.account_type and account.account_type.name == 'Loan' and transaction_type == 'loan_repayment':
                from app.services.emi_service import EMIService
                today = datetime.now().date()
                emi_marked = EMIService.mark_emi_paid(
                    account_id=account_id,
                    payment_amount=amount,
                    transaction_id=transaction.id,
                    payment_date=today
                )
                if emi_marked:
                    logger.info(f'EMI installment marked as paid for loan account {account_id}, transaction {transaction.id}')
                else:
                    logger.warning(f'Failed to mark EMI as paid for loan account {account_id}')
            
            db.session.commit()
            
            # Store values needed for email before starting thread (to avoid session issues)
            customer_email = account.customer.email if account.customer and account.customer.email else None
            customer_name = account.customer.name if account.customer else None
            account_type_name = account.account_type.name if account.account_type else 'Unknown'
            account_number = f"ACC{account.id:06d}"
            transaction_date = transaction.created_at.strftime('%B %d, %Y at %I:%M %p') if transaction.created_at else None
            
            # Send transaction notification email (non-blocking background thread)
            def send_transaction_email_async():
                try:
                    if customer_email and customer_name:
                        from app.services.email_service import EmailService
                        
                        EmailService.send_transaction_notification_email(
                            customer_email=customer_email,
                            customer_name=customer_name,
                            transaction_type=transaction_type,
                            amount=amount,
                            account_type=account_type_name,
                            account_number=account_number,
                            balance_before=balance_before,
                            balance_after=balance_after,
                            reference_number=reference_number,
                            description=description,
                            transaction_date=transaction_date
                        )
                        logger.info(f'Transaction notification email sent to {customer_email} for transaction {transaction.id}')
                    else:
                        logger.warning(f'Customer email not found for account {account_id}, skipping email notification')
                except Exception as email_error:
                    # Don't fail transaction if email fails
                    logger.error(f'Error sending transaction notification email: {email_error}')
                    import traceback
                    logger.error(f'Email error traceback: {traceback.format_exc()}')
            
            # Start email sending in background thread
            email_thread = threading.Thread(target=send_transaction_email_async, daemon=True)
            email_thread.start()
            logger.info(f'Transaction notification email sending started in background thread for transaction {transaction.id}')
            
            return {
                'success': True,
                'message': 'Transaction completed successfully',
                'data': transaction.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error creating transaction: {e}')
            return {
                'success': False,
                'message': 'Failed to create transaction',
                'data': None
            }
    
    @staticmethod
    def create_edit_request(transaction_id, new_amount, reason, requested_by, user_role=None):
        """Create a transaction edit request"""
        try:
            # Validate transaction exists
            transaction = Transaction.query.get(transaction_id)
            if not transaction:
                return {
                    'success': False,
                    'message': 'Transaction not found',
                    'data': None
                }
            
            # Check if manager/staff can edit this transaction
            # Managers and staff can only edit transactions they created
            # Admins can edit any transaction (but they use direct_edit, not edit_request)
            if user_role in ['manager']:
                if transaction.created_by != requested_by:
                    return {
                        'success': False,
                        'message': 'You can only edit transactions that you created. Auto-generated transactions (interest, penalties, etc.) cannot be edited.',
                        'data': None
                    }
            
            # Validate amount
            try:
                new_amount = float(new_amount)
                if new_amount <= 0:
                    return {
                        'success': False,
                        'message': 'Amount must be positive',
                        'data': None
                    }
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Invalid amount format',
                    'data': None
                }
            
            # Check if there's already a pending request for this transaction
            existing_request = TransactionEditRequest.query.filter_by(
                transaction_id=transaction_id,
                status='pending'
            ).first()
            
            if existing_request:
                return {
                    'success': False,
                    'message': 'A pending edit request already exists for this transaction',
                    'data': None
                }
            
            # Create edit request
            edit_request = TransactionEditRequest(
                transaction_id=transaction_id,
                requested_amount=new_amount,
                reason=reason,
                status='pending',
                requested_by=requested_by
            )
            
            db.session.add(edit_request)
            db.session.commit()
            
            logger.info(f'Edit request created: {edit_request.id} for transaction {transaction_id}')
            
            return {
                'success': True,
                'message': 'Edit request created successfully',
                'data': edit_request.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error creating edit request: {e}')
            return {
                'success': False,
                'message': 'Failed to create edit request',
                'data': None
            }
    
    @staticmethod
    def get_pending_edit_requests():
        """Get all pending edit requests (for admin dashboard)"""
        try:
            pending_requests = TransactionEditRequest.query.filter_by(
                status='pending'
            ).order_by(TransactionEditRequest.created_at.desc()).all()
            
            return {
                'success': True,
                'message': 'Pending edit requests retrieved successfully',
                'data': [request.to_dict() for request in pending_requests]
            }
            
        except Exception as e:
            logger.error(f'Error getting pending edit requests: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve pending edit requests',
                'data': None
            }
    
    @staticmethod
    def get_user_edit_requests(requested_by):
        """Get all edit requests created by a specific user (for manager/staff)"""
        try:
            edit_requests = TransactionEditRequest.query.filter_by(
                requested_by=requested_by
            ).order_by(TransactionEditRequest.created_at.desc()).all()
            
            return {
                'success': True,
                'message': 'Edit requests retrieved successfully',
                'data': [request.to_dict() for request in edit_requests]
            }
            
        except Exception as e:
            logger.error(f'Error getting user edit requests: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve edit requests',
                'data': None
            }
    
    @staticmethod
    def approve_edit_request(request_id, approved_by):
        """Approve edit request and update transaction (approved_by must be from users table)"""
        try:
            # Verify that approved_by is from users table (not customers table)
            from app.models.user import User
            admin_user = User.query.get(approved_by)
            if not admin_user or admin_user.role != 'admin':
                return {
                    'success': False,
                    'message': 'Invalid approver. Only admins from users table can approve requests.',
                    'data': None
                }
            # Get edit request
            edit_request = TransactionEditRequest.query.get(request_id)
            if not edit_request:
                return {
                    'success': False,
                    'message': 'Edit request not found',
                    'data': None
                }
            
            if edit_request.status != 'pending':
                return {
                    'success': False,
                    'message': f'Edit request is already {edit_request.status}',
                    'data': None
                }
            
            # Get transaction
            transaction = Transaction.query.get(edit_request.transaction_id)
            if not transaction:
                return {
                    'success': False,
                    'message': 'Transaction not found',
                    'data': None
                }
            
            # Get account
            account = Account.query.get(transaction.account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Calculate the difference
            old_amount = transaction.amount
            new_amount = edit_request.requested_amount
            amount_difference = new_amount - old_amount
            
            # Recalculate balance_before and balance_after
            # We need to reverse the old transaction effect and apply the new one
            # Get the balance that was before this transaction
            # We can get this from the transaction's balance_before field
            balance_before = transaction.balance_before
            
            # Calculate what the balance_after should be with the new amount
            # First, reverse the old transaction effect
            if transaction.transaction_type in ['deposit', 'interest', 'loan_disbursal']:
                # These add to balance, so reverse by subtracting old amount
                temp_balance = transaction.balance_after - old_amount
            elif transaction.transaction_type in ['withdrawal', 'penalty', 'loan_repayment']:
                # These subtract from balance, so reverse by adding old amount
                temp_balance = transaction.balance_after + old_amount
            else:
                temp_balance = transaction.balance_after
            
            # Now apply the new amount
            if transaction.transaction_type in ['deposit', 'interest', 'loan_disbursal']:
                balance_after = temp_balance + new_amount
            elif transaction.transaction_type in ['withdrawal', 'penalty', 'loan_repayment']:
                balance_after = temp_balance - new_amount
            else:
                balance_after = temp_balance
            
            # Update transaction
            transaction.amount = new_amount
            transaction.balance_before = balance_before
            transaction.balance_after = balance_after
            transaction.updated_at = datetime.utcnow()
            
            # Update account balance to match the new balance_after
            # We need to recalculate all subsequent transactions' balances
            # For now, let's update the account balance directly
            # Get all transactions after this one for the same account
            subsequent_transactions = Transaction.query.filter(
                Transaction.account_id == account.id,
                Transaction.id > transaction.id
            ).order_by(Transaction.id.asc()).all()
            
            # Update account balance
            account.balance = balance_after
            account.updated_at = datetime.utcnow()
            
            # Recalculate balances for subsequent transactions
            current_balance = balance_after
            for subsequent_txn in subsequent_transactions:
                if subsequent_txn.transaction_type in ['deposit', 'interest', 'loan_disbursal']:
                    subsequent_txn.balance_before = current_balance
                    current_balance = current_balance + subsequent_txn.amount
                    subsequent_txn.balance_after = current_balance
                elif subsequent_txn.transaction_type in ['withdrawal', 'penalty', 'loan_repayment']:
                    subsequent_txn.balance_before = current_balance
                    current_balance = current_balance - subsequent_txn.amount
                    subsequent_txn.balance_after = current_balance
                subsequent_txn.updated_at = datetime.utcnow()
            
            # Update account balance to final calculated balance
            account.balance = current_balance
            
            # Mark edit request as approved and store old_amount
            edit_request.status = 'approved'
            edit_request.approved_by = approved_by
            edit_request.old_amount = old_amount  # Store the old amount before this edit
            edit_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f'Edit request {request_id} approved. Transaction {transaction.id} updated from {old_amount} to {new_amount}')
            
            # Store values needed for email before starting thread (to avoid session issues)
            customer_email = account.customer.email if account.customer and account.customer.email else None
            customer_name = account.customer.name if account.customer else None
            account_type_name = account.account_type.name if account.account_type else 'Unknown'
            account_number = f"ACC{account.id:06d}"
            transaction_date = transaction.updated_at.strftime('%B %d, %Y at %I:%M %p') if transaction.updated_at else None
            final_balance = account.balance  # Use final account balance after all recalculations
            update_description = f"Transaction amount updated from ₹{old_amount:,.2f} to ₹{new_amount:,.2f}. {edit_request.reason or 'Transaction updated by admin.'}"
            
            # Send transaction update notification email (non-blocking background thread)
            def send_transaction_update_email_async():
                try:
                    if customer_email and customer_name:
                        from app.services.email_service import EmailService
                        
                        EmailService.send_transaction_notification_email(
                            customer_email=customer_email,
                            customer_name=customer_name,
                            transaction_type=transaction.transaction_type,
                            amount=new_amount,
                            account_type=account_type_name,
                            account_number=account_number,
                            balance_before=balance_before,
                            balance_after=final_balance,
                            reference_number=transaction.reference_number,
                            description=update_description,
                            transaction_date=transaction_date
                        )
                        logger.info(f'Transaction update notification email sent to {customer_email} for transaction {transaction.id}')
                    else:
                        logger.warning(f'Customer email not found for account {account.id}, skipping email notification')
                except Exception as email_error:
                    # Don't fail transaction update if email fails
                    logger.error(f'Error sending transaction update notification email: {email_error}')
                    import traceback
                    logger.error(f'Email error traceback: {traceback.format_exc()}')
            
            # Start email sending in background thread
            email_thread = threading.Thread(target=send_transaction_update_email_async, daemon=True)
            email_thread.start()
            logger.info(f'Transaction update notification email sending started in background thread for transaction {transaction.id}')
            
            return {
                'success': True,
                'message': 'Edit request approved and transaction updated successfully',
                'data': {
                    'edit_request': edit_request.to_dict(),
                    'transaction': transaction.to_dict(),
                    'account': account.to_dict()
                }
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error approving edit request: {e}')
            return {
                'success': False,
                'message': 'Failed to approve edit request',
                'data': None
            }
    
    @staticmethod
    def direct_edit_transaction(transaction_id, new_amount, reason, edited_by):
        """Directly edit transaction (Admin only) - bypasses edit request flow"""
        try:
            # Verify that edited_by is from users table (not customers table) and is admin
            from app.models.user import User
            admin_user = User.query.get(edited_by)
            if not admin_user or admin_user.role != 'admin':
                return {
                    'success': False,
                    'message': 'Invalid editor. Only admins from users table can directly edit transactions.',
                    'data': None
                }
            
            # Get transaction
            transaction = Transaction.query.get(transaction_id)
            if not transaction:
                return {
                    'success': False,
                    'message': 'Transaction not found',
                    'data': None
                }
            
            # Get account
            account = Account.query.get(transaction.account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Calculate the difference
            old_amount = transaction.amount
            new_amount = float(new_amount)
            amount_difference = new_amount - old_amount
            
            if old_amount == new_amount:
                return {
                    'success': False,
                    'message': 'New amount must be different from current amount',
                    'data': None
                }
            
            # Recalculate balance_before and balance_after
            balance_before = transaction.balance_before
            
            # First, reverse the old transaction effect
            if transaction.transaction_type in ['deposit', 'interest', 'loan_disbursal']:
                temp_balance = transaction.balance_after - old_amount
            elif transaction.transaction_type in ['withdrawal', 'penalty', 'loan_repayment']:
                temp_balance = transaction.balance_after + old_amount
            else:
                temp_balance = transaction.balance_after
            
            # Now apply the new amount
            if transaction.transaction_type in ['deposit', 'interest', 'loan_disbursal']:
                balance_after = temp_balance + new_amount
            elif transaction.transaction_type in ['withdrawal', 'penalty', 'loan_repayment']:
                balance_after = temp_balance - new_amount
            else:
                balance_after = temp_balance
            
            # Update transaction
            transaction.amount = new_amount
            transaction.balance_before = balance_before
            transaction.balance_after = balance_after
            transaction.updated_at = datetime.utcnow()
            
            # Update account balance to match the new balance_after
            # Recalculate all subsequent transactions' balances
            subsequent_transactions = Transaction.query.filter(
                Transaction.account_id == account.id,
                Transaction.id > transaction.id
            ).order_by(Transaction.id.asc()).all()
            
            # Update account balance
            account.balance = balance_after
            account.updated_at = datetime.utcnow()
            
            # Recalculate balances for subsequent transactions
            current_balance = balance_after
            for subsequent_txn in subsequent_transactions:
                if subsequent_txn.transaction_type in ['deposit', 'interest', 'loan_disbursal']:
                    subsequent_txn.balance_before = current_balance
                    current_balance = current_balance + subsequent_txn.amount
                    subsequent_txn.balance_after = current_balance
                elif subsequent_txn.transaction_type in ['withdrawal', 'penalty', 'loan_repayment']:
                    subsequent_txn.balance_before = current_balance
                    current_balance = current_balance - subsequent_txn.amount
                    subsequent_txn.balance_after = current_balance
                subsequent_txn.updated_at = datetime.utcnow()
            
            # Update account balance to final calculated balance
            account.balance = current_balance
            
            # Create edit request record for audit trail (auto-approved)
            edit_request = TransactionEditRequest(
                transaction_id=transaction_id,
                requested_amount=new_amount,
                reason=reason or 'Direct edit by admin',
                status='approved',  # Auto-approved for direct edits
                requested_by=edited_by,  # Admin who made the direct edit
                approved_by=edited_by,  # Same admin
                requested_description=None,
                old_amount=old_amount  # Store the old amount before this edit
            )
            db.session.add(edit_request)
            
            db.session.commit()
            
            logger.info(f'Direct edit by admin {edited_by}. Transaction {transaction.id} updated from {old_amount} to {new_amount}')
            
            # Store values needed for email before starting thread (to avoid session issues)
            customer_email = account.customer.email if account.customer and account.customer.email else None
            customer_name = account.customer.name if account.customer else None
            account_type_name = account.account_type.name if account.account_type else 'Unknown'
            account_number = f"ACC{account.id:06d}"
            transaction_date = transaction.updated_at.strftime('%B %d, %Y at %I:%M %p') if transaction.updated_at else None
            final_balance = account.balance
            update_description = f"Transaction amount updated from ₹{old_amount:,.2f} to ₹{new_amount:,.2f}. {reason or 'Transaction updated by admin.'}"
            
            # Send transaction update notification email (non-blocking background thread)
            def send_transaction_update_email_async():
                try:
                    if customer_email and customer_name:
                        from app.services.email_service import EmailService
                        
                        EmailService.send_transaction_notification_email(
                            customer_email=customer_email,
                            customer_name=customer_name,
                            transaction_type=transaction.transaction_type,
                            amount=new_amount,
                            account_type=account_type_name,
                            account_number=account_number,
                            balance_before=balance_before,
                            balance_after=final_balance,
                            reference_number=transaction.reference_number,
                            description=update_description,
                            transaction_date=transaction_date
                        )
                        logger.info(f'Transaction update notification email sent to {customer_email} for transaction {transaction.id}')
                    else:
                        logger.warning(f'Customer email not found for account {account.id}, skipping email notification')
                except Exception as email_error:
                    # Don't fail transaction update if email fails
                    logger.error(f'Error sending transaction update notification email: {email_error}')
                    import traceback
                    logger.error(f'Email error traceback: {traceback.format_exc()}')
            
            # Start email sending in background thread
            email_thread = threading.Thread(target=send_transaction_update_email_async, daemon=True)
            email_thread.start()
            logger.info(f'Transaction update notification email sending started in background thread for transaction {transaction.id}')
            
            return {
                'success': True,
                'message': 'Transaction updated successfully',
                'data': {
                    'edit_request': edit_request.to_dict(),
                    'transaction': transaction.to_dict(),
                    'account': account.to_dict()
                }
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error directly editing transaction: {e}')
            return {
                'success': False,
                'message': 'Failed to edit transaction',
                'data': None
            }
    
    @staticmethod
    def get_transaction_edit_history(transaction_id):
        """Get edit history for a transaction"""
        try:
            transaction = Transaction.query.get(transaction_id)
            if not transaction:
                return {
                    'success': False,
                    'message': 'Transaction not found',
                    'data': None
                }
            
            # Get all approved edit requests for this transaction, ordered by creation time (oldest first)
            edit_requests = TransactionEditRequest.query.filter_by(
                transaction_id=transaction_id,
                status='approved'
            ).order_by(TransactionEditRequest.created_at.asc()).all()
            
            history = []
            
            for edit_request in edit_requests:
                # Get editor name (who approved/edited)
                edited_by_name = None
                if edit_request.approved_by:
                    from app.models.user import User
                    admin_user = User.query.get(edit_request.approved_by)
                    if admin_user:
                        edited_by_name = admin_user.name
                
                # Get requester name (who created the edit request)
                requested_by_name = None
                if edit_request.requested_by:
                    from app.models.user import User
                    from app.models.customer import Customer
                    requester_user = User.query.get(edit_request.requested_by)
                    if requester_user:
                        requested_by_name = requester_user.name
                    else:
                        requester_customer = Customer.query.get(edit_request.requested_by)
                        if requester_customer:
                            requested_by_name = requester_customer.name
                
                # Determine edit method
                edit_method = 'direct' if edit_request.requested_by == edit_request.approved_by else 'approved_request'
                
                # Use stored old_amount if available, otherwise calculate from transaction
                # For backward compatibility, if old_amount is None, use transaction's current amount
                # But ideally old_amount should always be set when approved
                old_amount = edit_request.old_amount if edit_request.old_amount is not None else transaction.amount
                
                history.append({
                    'id': edit_request.id,
                    'old_amount': old_amount,  # Use stored old_amount
                    'new_amount': edit_request.requested_amount,
                    'reason': edit_request.reason,
                    'edited_by': edited_by_name,
                    'requested_by': requested_by_name,
                    'edited_at': edit_request.updated_at.isoformat() if edit_request.updated_at else edit_request.created_at.isoformat(),
                    'edit_method': edit_method
                })
            
            # Reverse to show most recent first
            history.reverse()
            
            return {
                'success': True,
                'message': 'Edit history retrieved successfully',
                'data': history
            }
            
        except Exception as e:
            logger.error(f'Error getting transaction edit history: {e}')
            import traceback
            logger.error(f'Traceback: {traceback.format_exc()}')
            return {
                'success': False,
                'message': 'Failed to retrieve edit history',
                'data': None
            }
    
    @staticmethod
    def reject_edit_request(request_id, rejected_by):
        """Reject edit request (rejected_by must be from users table)"""
        try:
            # Verify that rejected_by is from users table (not customers table)
            from app.models.user import User
            admin_user = User.query.get(rejected_by)
            if not admin_user or admin_user.role != 'admin':
                return {
                    'success': False,
                    'message': 'Invalid rejector. Only admins from users table can reject requests.',
                    'data': None
                }
            
            # Get edit request
            edit_request = TransactionEditRequest.query.get(request_id)
            if not edit_request:
                return {
                    'success': False,
                    'message': 'Edit request not found',
                    'data': None
                }
            
            if edit_request.status != 'pending':
                return {
                    'success': False,
                    'message': f'Edit request is already {edit_request.status}',
                    'data': None
                }
            
            # Mark edit request as rejected
            edit_request.status = 'rejected'
            edit_request.approved_by = rejected_by  # Store in approved_by field (used for both approve/reject)
            edit_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f'Edit request {request_id} rejected')
            
            return {
                'success': True,
                'message': 'Edit request rejected successfully',
                'data': edit_request.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error rejecting edit request: {e}')
            return {
                'success': False,
                'message': 'Failed to reject edit request',
                'data': None
            }
    @staticmethod
    def get_account_transactions(account_id, page=1, limit=10, transaction_type=None, start_date=None, end_date=None):
        """Get transactions for a specific account with pagination and filters"""
        try:
            query = Transaction.query.filter_by(account_id=account_id)
            
            # Apply filters
            if transaction_type:
                query = query.filter_by(transaction_type=transaction_type)
            
            if start_date:
                query = query.filter(Transaction.created_at >= start_date)
            
            if end_date:
                query = query.filter(Transaction.created_at <= end_date)
            
            # Order by created_at descending
            query = query.order_by(Transaction.created_at.desc())
            
            # Get total count
            total_count = query.count()
            
            # Apply pagination
            offset = (page - 1) * limit
            transactions = query.offset(offset).limit(limit).all()
            
            # Calculate pagination info
            total_pages = (total_count + limit - 1) // limit
            has_next = page < total_pages
            has_prev = page > 1
            
            return {
                'success': True,
                'message': 'Transactions retrieved successfully',
                'data': [transaction.to_dict() for transaction in transactions],
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_count': total_count,
                    'limit': limit,
                    'has_next': has_next,
                    'has_prev': has_prev
                }
            }
            
        except Exception as e:
            logger.error(f'Error getting account transactions: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve transactions',
                'data': None
            }
    
    @staticmethod
    def get_all_transactions(page=1, limit=10, transaction_type=None, account_id=None, customer_id=None, start_date=None, end_date=None, search=None, user_role=None, user_id=None):
        """Get all transactions with pagination and filters (Admin/Manager only)"""
        try:
            query = Transaction.query.join(Account).join(Customer)
            
            # For managers, filter transactions to only show those for their assigned customers
            if user_role == 'manager' and user_id:
                query = query.filter(Customer.assigned_manager_id == user_id)
            
            # Apply filters
            if transaction_type:
                query = query.filter(Transaction.transaction_type == transaction_type)
            
            if customer_id:
                query = query.filter(Customer.id == customer_id)
            
            if account_id:
                query = query.filter(Transaction.account_id == account_id)
            
            if start_date:
                query = query.filter(Transaction.created_at >= start_date)
            
            if end_date:
                query = query.filter(Transaction.created_at <= end_date)
            
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    db.or_(
                        Customer.name.ilike(search_term),
                        Transaction.reference_number.ilike(search_term),
                        Transaction.description.ilike(search_term)
                    )
                )
            
            # Order by created_at descending
            query = query.order_by(Transaction.created_at.desc())
            
            # Get total count
            total_count = query.count()
            
            # Apply pagination
            offset = (page - 1) * limit
            transactions = query.offset(offset).limit(limit).all()
            
            # Calculate pagination info
            total_pages = (total_count + limit - 1) // limit
            has_next = page < total_pages
            has_prev = page > 1
            
            return {
                'success': True,
                'message': 'Transactions retrieved successfully',
                'data': [transaction.to_dict() for transaction in transactions],
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_count': total_count,
                    'limit': limit,
                    'has_next': has_next,
                    'has_prev': has_prev
                }
            }
            
        except Exception as e:
            logger.error(f'Error getting all transactions: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve transactions',
                'data': None
            }
    
    @staticmethod
    def get_transaction_summary(account_id=None, start_date=None, end_date=None):
        """Get transaction summary statistics"""
        try:
            query = Transaction.query
            
            if account_id:
                query = query.filter_by(account_id=account_id)
            
            if start_date:
                query = query.filter(Transaction.created_at >= start_date)
            
            if end_date:
                query = query.filter(Transaction.created_at <= end_date)
            
            # Get all transactions
            transactions = query.all()
            
            # Calculate summary
            total_deposits = sum(t.amount for t in transactions if t.transaction_type in ['deposit', 'interest', 'loan_disbursal'])
            total_withdrawals = sum(t.amount for t in transactions if t.transaction_type in ['withdrawal', 'penalty', 'loan_repayment'])
            total_transactions = len(transactions)
            
            # Group by transaction type
            type_summary = {}
            for transaction in transactions:
                t_type = transaction.transaction_type
                if t_type not in type_summary:
                    type_summary[t_type] = {'count': 0, 'amount': 0}
                type_summary[t_type]['count'] += 1
                type_summary[t_type]['amount'] += transaction.amount
            
            return {
                'success': True,
                'message': 'Transaction summary retrieved successfully',
                'data': {
                    'total_deposits': total_deposits,
                    'total_withdrawals': total_withdrawals,
                    'net_amount': total_deposits - total_withdrawals,
                    'total_transactions': total_transactions,
                    'type_summary': type_summary
                }
            }
            
        except Exception as e:
            logger.error(f'Error getting transaction summary: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve transaction summary',
                'data': None
            }
    
    @staticmethod
    def process_loan_repayment(account_id, amount, description, created_by):
        """Process loan repayment transaction"""
        try:
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Check if it's a loan account
            if account.account_type.name != 'Loan':
                return {
                    'success': False,
                    'message': 'Account is not a loan account',
                    'data': None
                }
            
            # For loan accounts, balance is negative (outstanding amount)
            # Repayment reduces the outstanding amount
            if account.balance >= 0:
                return {
                    'success': False,
                    'message': 'Loan account has no outstanding balance',
                    'data': None
                }
            
            # Process repayment
            return TransactionService.create_transaction(
                account_id=account_id,
                transaction_type='loan_repayment',
                amount=amount,
                description=description or f"Loan repayment of {amount}",
                created_by=created_by
            )
            
        except Exception as e:
            logger.error(f'Error processing loan repayment: {e}')
            return {
                'success': False,
                'message': 'Failed to process loan repayment',
                'data': None
            }
    
    @staticmethod
    def calculate_interest(account_id, created_by, force=False):
        """Calculate and apply interest for Savings, RD, FD, and DDS accounts"""
        try:
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            if account.status != 'active':
                return {
                    'success': False,
                    'message': 'Can only calculate interest for active accounts',
                    'data': None
                }
            
            account_type = account.account_type
            if not account_type:
                return {
                    'success': False,
                    'message': 'Account type not found',
                    'data': None
                }
            
            # Use effective interest rate (snapshot or custom) from account
            interest_rate = account.get_effective_interest_rate()
            calculation_method = account.get_effective_interest_calculation_method()
            calculation_frequency = account.snapshot_interest_calculation_frequency or account_type.interest_calculation_frequency or 'yearly'
            
            # Determine calculation period based on account type
            if account_type.name == 'Savings':
                # For Savings, calculate interest based on frequency
                if not force:
                    # Check if interest was already calculated for this period
                    if account.last_interest_calculated_date:
                        today = datetime.now().date()
                        last_calc = account.last_interest_calculated_date
                        
                        # Determine next calculation date based on frequency
                        if calculation_frequency == 'monthly':
                            next_calc = last_calc + timedelta(days=30)
                        elif calculation_frequency == 'quarterly':
                            next_calc = last_calc + timedelta(days=90)
                        elif calculation_frequency == 'yearly':
                            next_calc = last_calc + timedelta(days=365)
                        else:  # daily
                            next_calc = last_calc + timedelta(days=1)
                        
                        if today < next_calc:
                            return {
                                'success': False,
                                'message': f'Interest already calculated. Next calculation date: {next_calc.strftime("%Y-%m-%d")}',
                                'data': None
                            }
                    
                    # Determine period for calculation
                    if account.last_interest_calculated_date:
                        period_start = account.last_interest_calculated_date
                    else:
                        period_start = account.start_date
                    
                    period_end = datetime.now().date()
                    days = (period_end - period_start).days
                    
                    if days <= 0:
                        return {
                            'success': False,
                            'message': 'No interest period to calculate',
                            'data': None
                        }
                    
                    # Calculate interest based on average balance or current balance
                    # For simplicity, using current balance. Can be enhanced to use average daily balance
                    years = days / 365.25
                    
                    if calculation_method == 'simple':
                        interest_amount = account.balance * (interest_rate / 100) * years
                    else:  # compound
                        # For compound, calculate based on frequency
                        if calculation_frequency == 'monthly':
                            periods = days / 30.0
                            interest_amount = account.balance * ((1 + interest_rate / 100 / 12) ** periods - 1)
                        elif calculation_frequency == 'quarterly':
                            periods = days / 90.0
                            interest_amount = account.balance * ((1 + interest_rate / 100 / 4) ** periods - 1)
                        elif calculation_frequency == 'yearly':
                            interest_amount = account.balance * ((1 + interest_rate / 100) ** years - 1)
                        else:  # daily
                            periods = days
                            interest_amount = account.balance * ((1 + interest_rate / 100 / 365.25) ** periods - 1)
                else:
                    # Force calculation - calculate from start date
                    days = (datetime.now().date() - account.start_date).days
                    years = days / 365.25
                    
                    if calculation_method == 'simple':
                        interest_amount = account.balance * (interest_rate / 100) * years
                    else:
                        interest_amount = account.balance * ((1 + interest_rate / 100) ** years - 1)
            else:
                # For RD/FD/DDS, calculate from start date to now
                days = (datetime.now().date() - account.start_date).days
                years = days / 365.25
                
                if calculation_method == 'simple':
                    interest_amount = account.balance * (interest_rate / 100) * years
                else:
                    interest_amount = account.balance * ((1 + interest_rate / 100) ** years - 1)
            
            if interest_amount <= 0:
                return {
                    'success': False,
                    'message': 'No interest to calculate',
                    'data': None
                }
            
            # Create interest transaction
            result = TransactionService.create_transaction(
                account_id=account_id,
                transaction_type='interest',
                amount=interest_amount,
                description=f"Interest calculated for {account_type.name} account ({calculation_frequency})",
                created_by=created_by
            )
            
            # Update last_interest_calculated_date if transaction was successful
            if result.get('success'):
                account.last_interest_calculated_date = datetime.now().date()
                db.session.commit()
            
            return result
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error calculating interest: {e}')
            return {
                'success': False,
                'message': 'Failed to calculate interest',
                'data': None
            }
    
    @staticmethod
    def bulk_calculate_interest_for_savings(created_by):
        """Calculate interest for all active Savings accounts that are due"""
        try:
            from app.models import AccountType
            
            # Get Savings account type
            savings_type = AccountType.query.filter_by(name='Savings').first()
            if not savings_type:
                return {
                    'success': False,
                    'message': 'Savings account type not found',
                    'data': None
                }
            
            # Get all active Savings accounts
            savings_accounts = Account.query.filter_by(
                account_type_id=savings_type.id,
                status='active'
            ).all()
            
            if not savings_accounts:
                return {
                    'success': True,
                    'message': 'No active Savings accounts found',
                    'data': {
                        'total_accounts': 0,
                        'calculated': 0,
                        'skipped': 0,
                        'failed': 0
                    }
                }
            
            calculated = 0
            skipped = 0
            failed = 0
            results = []
            
            for account in savings_accounts:
                try:
                    result = TransactionService.calculate_interest(
                        account_id=account.id,
                        created_by=created_by,
                        force=False  # Don't force, respect frequency
                    )
                    
                    if result.get('success'):
                        calculated += 1
                    else:
                        # Check if it was skipped due to frequency
                        if 'already calculated' in result.get('message', '').lower():
                            skipped += 1
                        else:
                            failed += 1
                    
                    results.append({
                        'account_id': account.id,
                        'customer_id': account.customer_id,
                        'success': result.get('success'),
                        'message': result.get('message')
                    })
                except Exception as e:
                    logger.error(f'Error calculating interest for account {account.id}: {e}')
                    failed += 1
                    results.append({
                        'account_id': account.id,
                        'customer_id': account.customer_id,
                        'success': False,
                        'message': str(e)
                    })
            
            return {
                'success': True,
                'message': f'Interest calculation completed. Calculated: {calculated}, Skipped: {skipped}, Failed: {failed}',
                'data': {
                    'total_accounts': len(savings_accounts),
                    'calculated': calculated,
                    'skipped': skipped,
                    'failed': failed,
                    'results': results
                }
            }
            
        except Exception as e:
            logger.error(f'Error in bulk_calculate_interest_for_savings: {e}')
            return {
                'success': False,
                'message': 'Failed to bulk calculate interest',
                'data': None
            }
