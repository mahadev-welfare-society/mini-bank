from app import db
from app.models import Customer, Account, AccountType, Transaction
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class DashboardService:
    @staticmethod
    def get_dashboard_data(user_role, user_id=None):
        """Get dashboard data based on user role"""
        try:
            if user_role == 'admin':
                return DashboardService.get_admin_dashboard_data()
            elif user_role == 'manager':
                return DashboardService.get_manager_dashboard_data(user_id)
            elif user_role == 'staff':
                return DashboardService.get_staff_dashboard_data(user_id)
            else:
                return {'success': False, 'message': 'Invalid user role', 'data': None}
        except Exception as e:
            logger.error(f'Error getting dashboard data: {e}')
            return {'success': False, 'message': 'Failed to get dashboard data', 'data': None}

    @staticmethod
    def get_admin_dashboard_data():
        """Get dashboard data for admin"""
        try:
            # Get customer counts
            total_customers = Customer.query.filter(Customer.role == 'staff').count()
            
            # Get account data
            accounts = Account.query.filter(Account.status == 'active').all()
            active_accounts = len(accounts)
            
            # Calculate account type distribution
            account_type_counts = {}
            total_balance = 0
            for account in accounts:
                account_type_name = account.account_type.name if account.account_type else 'Unknown'
                account_type_counts[account_type_name] = account_type_counts.get(account_type_name, 0) + 1
                total_balance += account.balance or 0
            
            # Get transaction data
            recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(5).all()
            
            # Calculate financial metrics
            total_deposits = db.session.query(db.func.sum(Transaction.amount)).filter(
                Transaction.transaction_type.in_(['deposit', 'interest', 'loan_disbursal']),
                Transaction.status == 'completed'
            ).scalar() or 0
            
            total_withdrawals = db.session.query(db.func.sum(Transaction.amount)).filter(
                Transaction.transaction_type.in_(['withdrawal', 'penalty', 'loan_repayment']),
                Transaction.status == 'completed'
            ).scalar() or 0
            
            pending_transactions = Transaction.query.filter(Transaction.status == 'pending').count()
            
            # Get recent customers
            recent_customers = Customer.query.filter(
                Customer.role == 'staff'
            ).order_by(Customer.created_at.desc()).limit(5).all()
            
            # Get upcoming maturities (FD/RD/DDS accounts)
            upcoming_maturities = []
            for account in accounts:
                if account.maturity_date and account.account_type and account.account_type.name in ['FD', 'RD', 'DDS']:
                    if account.maturity_date >= datetime.now().date():
                        upcoming_maturities.append({
                            'id': account.id,
                            'customer_name': account.customer.name if account.customer else 'Unknown',
                            'amount': account.balance,
                            'date': account.maturity_date.strftime('%b %d, %Y'),
                            'type': account.account_type.name
                        })
            
            # Sort by maturity date and take first 5
            upcoming_maturities.sort(key=lambda x: datetime.strptime(x['date'], '%b %d, %Y'))
            upcoming_maturities = upcoming_maturities[:5]
            
            # Get overdue payments (mock data for now - would need loan schedule logic)
            overdue_payments = []
            
            return {
                'success': True,
                'data': {
                    'total_customers': total_customers,
                    'total_staff': total_customers,  # Same as total_customers for staff role
                    'active_accounts': active_accounts,
                    'total_balance': total_balance,
                    'account_distribution': {
                        'dds': account_type_counts.get('DDS', 0),
                        'savings': account_type_counts.get('Savings', 0),
                        'rd': account_type_counts.get('RD', 0),
                        'fd': account_type_counts.get('FD', 0),
                        'loan': account_type_counts.get('Loan', 0)
                    },
                    'financial_metrics': {
                        'total_deposits': total_deposits,
                        'total_withdrawals': total_withdrawals,
                        'pending_transactions': pending_transactions
                    },
                    'recent_customers': [customer.to_dict() for customer in recent_customers],
                    'recent_transactions': [transaction.to_dict() for transaction in recent_transactions],
                    'upcoming_maturities': upcoming_maturities,
                    'overdue_payments': overdue_payments,
                    'system_status': 'Online',
                    'monthly_growth': 12.5,  # Mock data - would need historical comparison
                    'customer_satisfaction': 4.8,  # Mock data
                    'system_uptime': 99.9  # Mock data
                }
            }
        except Exception as e:
            logger.error(f'Error getting admin dashboard data: {e}')
            return {'success': False, 'message': 'Failed to get admin dashboard data', 'data': None}

    @staticmethod
    def get_manager_dashboard_data(manager_id):
        """Get dashboard data for manager (only assigned customers)"""
        try:
            # Get customer counts - only customers assigned to this manager
            total_customers = Customer.query.filter(
                Customer.role == 'staff',
                Customer.assigned_manager_id == manager_id
            ).count()
            
            # Get accounts for assigned customers only
            assigned_customer_ids = [
                c.id for c in Customer.query.filter(
                    Customer.role == 'staff',
                    Customer.assigned_manager_id == manager_id
                ).all()
            ]
            
            if assigned_customer_ids:
                accounts = Account.query.filter(
                    Account.status == 'active',
                    Account.customer_id.in_(assigned_customer_ids)
                ).all()
            else:
                accounts = []
            active_accounts = len(accounts)
            
            # Calculate account type distribution
            account_type_counts = {}
            total_balance = 0
            for account in accounts:
                account_type_name = account.account_type.name if account.account_type else 'Unknown'
                account_type_counts[account_type_name] = account_type_counts.get(account_type_name, 0) + 1
                total_balance += account.balance or 0
            
            # Get transaction data for assigned customers only
            account_ids = [acc.id for acc in accounts]
            if account_ids:
                recent_transactions = Transaction.query.filter(
                    Transaction.account_id.in_(account_ids)
                ).order_by(Transaction.created_at.desc()).limit(5).all()
            else:
                recent_transactions = []
            
            # Calculate financial metrics for assigned customers only
            if account_ids:
                total_deposits = db.session.query(db.func.sum(Transaction.amount)).filter(
                    Transaction.account_id.in_(account_ids),
                    Transaction.transaction_type.in_(['deposit', 'interest', 'loan_disbursal']),
                    Transaction.status == 'completed'
                ).scalar() or 0
                
                total_withdrawals = db.session.query(db.func.sum(Transaction.amount)).filter(
                    Transaction.account_id.in_(account_ids),
                    Transaction.transaction_type.in_(['withdrawal', 'penalty', 'loan_repayment']),
                    Transaction.status == 'completed'
                ).scalar() or 0
                
                pending_transactions = Transaction.query.filter(
                    Transaction.account_id.in_(account_ids),
                    Transaction.status == 'pending'
                ).count()
            else:
                total_deposits = 0
                total_withdrawals = 0
                pending_transactions = 0
            
            # Get recent customers (assigned to this manager)
            recent_customers = Customer.query.filter(
                Customer.role == 'staff',
                Customer.assigned_manager_id == manager_id
            ).order_by(Customer.created_at.desc()).limit(5).all()
            
            # Get upcoming maturities (FD/RD/DDS accounts) for assigned customers
            upcoming_maturities = []
            for account in accounts:
                if account.maturity_date and account.account_type and account.account_type.name in ['FD', 'RD', 'DDS']:
                    if account.maturity_date >= datetime.now().date():
                        upcoming_maturities.append({
                            'id': account.id,
                            'customer_name': account.customer.name if account.customer else 'Unknown',
                            'amount': account.balance,
                            'date': account.maturity_date.strftime('%b %d, %Y'),
                            'type': account.account_type.name
                        })
            
            # Sort by maturity date and take first 5
            upcoming_maturities.sort(key=lambda x: datetime.strptime(x['date'], '%b %d, %Y'))
            upcoming_maturities = upcoming_maturities[:5]
            
            # Get overdue payments (mock data for now - would need loan schedule logic)
            overdue_payments = []
            
            return {
                'success': True,
                'data': {
                    'total_customers': total_customers,
                    'total_staff': total_customers,  # Same as total_customers for staff role
                    'active_accounts': active_accounts,
                    'total_balance': total_balance,
                    'account_distribution': {
                        'dds': account_type_counts.get('DDS', 0),
                        'savings': account_type_counts.get('Savings', 0),
                        'rd': account_type_counts.get('RD', 0),
                        'fd': account_type_counts.get('FD', 0),
                        'loan': account_type_counts.get('Loan', 0)
                    },
                    'financial_metrics': {
                        'total_deposits': total_deposits,
                        'total_withdrawals': total_withdrawals,
                        'pending_transactions': pending_transactions
                    },
                    'recent_customers': [customer.to_dict() for customer in recent_customers],
                    'recent_transactions': [transaction.to_dict() for transaction in recent_transactions],
                    'upcoming_maturities': upcoming_maturities,
                    'overdue_payments': overdue_payments,
                    'system_status': 'Online',
                    'monthly_growth': 12.5,  # Mock data - would need historical comparison
                    'customer_satisfaction': 4.8,  # Mock data
                    'system_uptime': 99.9  # Mock data
                }
            }
        except Exception as e:
            logger.error(f'Error getting manager dashboard data: {e}')
            return {'success': False, 'message': 'Failed to get manager dashboard data', 'data': None}

    @staticmethod
    def get_staff_dashboard_data(user_id):
        """Get dashboard data for staff user"""
        try:
            # Get staff customer data
            customer = Customer.query.get(user_id)
            if not customer:
                return {'success': False, 'message': 'Customer not found', 'data': None}
            
            # Get staff's accounts
            accounts = Account.query.filter(
                Account.customer_id == user_id,
                Account.status == 'active'
            ).all()
            
            # Calculate personal balance
            personal_balance = sum(account.balance or 0 for account in accounts)
            
            # Get account type distribution for this staff
            account_type_counts = {}
            for account in accounts:
                account_type_name = account.account_type.name if account.account_type else 'Unknown'
                account_type_counts[account_type_name] = account_type_counts.get(account_type_name, 0) + 1
            
            # Get recent transactions for this staff
            recent_transactions = []
            for account in accounts:
                account_transactions = Transaction.query.filter(
                    Transaction.account_id == account.id
                ).order_by(Transaction.created_at.desc()).limit(3).all()
                recent_transactions.extend(account_transactions)
            
            # Sort by date and take first 5
            recent_transactions.sort(key=lambda x: x.created_at, reverse=True)
            recent_transactions = recent_transactions[:5]
            
            # Map account data to include lowercase account_type for frontend compatibility
            mapped_accounts = []
            for account in accounts:
                account_dict = account.to_dict()
                # Map database names to frontend lowercase values
                name_mapping = {
                    'Savings': 'savings',
                    'RD': 'rd', 
                    'FD': 'fd',
                    'Loan': 'loan'
                }
                account_dict['account_type'] = name_mapping.get(account.account_type.name, account.account_type.name.lower() if account.account_type else 'unknown')
                mapped_accounts.append(account_dict)
            
            return {
                'success': True,
                'data': {
                    'personal_balance': personal_balance,
                    'account_count': len(accounts),
                    'account_distribution': {
                        'dds': account_type_counts.get('DDS', 0),
                        'savings': account_type_counts.get('Savings', 0),
                        'rd': account_type_counts.get('RD', 0),
                        'fd': account_type_counts.get('FD', 0),
                        'loan': account_type_counts.get('Loan', 0)
                    },
                    'accounts': mapped_accounts,
                    'recent_transactions': [transaction.to_dict() for transaction in recent_transactions],
                    'customer_info': customer.to_dict()
                }
            }
        except Exception as e:
            logger.error(f'Error getting staff dashboard data: {e}')
            return {'success': False, 'message': 'Failed to get staff dashboard data', 'data': None}
