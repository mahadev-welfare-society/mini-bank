"""Enhance AccountType model with advanced banking parameters

Revision ID: enhanced_accounttype_custom
Revises: 616b6c68c8db
Create Date: 2025-10-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'enhanced_accounttype_custom'
down_revision = '616b6c68c8db'
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns as nullable first
    with op.batch_alter_table('account_types', schema=None) as batch_op:
        batch_op.add_column(sa.Column('min_deposit', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('max_deposit', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('min_withdrawal', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('max_withdrawal', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('withdrawal_limit_daily', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('withdrawal_limit_monthly', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('contribution_frequency', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('min_contribution_amount', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('lock_in_period_days', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('early_withdrawal_penalty_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('loan_parameters', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('is_template', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('version', sa.Integer(), nullable=True))

    # Update existing records with default values
    account_types_table = table(
        'account_types',
        column('id', Integer),
        column('name', String),
        column('min_deposit', Float),
        column('max_deposit', Float),
        column('min_withdrawal', Float),
        column('max_withdrawal', Float),
        column('withdrawal_limit_daily', Float),
        column('withdrawal_limit_monthly', Float),
        column('contribution_frequency', String),
        column('min_contribution_amount', Float),
        column('lock_in_period_days', Integer),
        column('early_withdrawal_penalty_rate', Float),
        column('loan_parameters', Text),
        column('is_template', Boolean),
        column('version', Integer)
    )

    # Get existing account types and update them with appropriate defaults
    conn = op.get_bind()
    results = conn.execute(sa.text("SELECT id, name FROM account_types")).fetchall()
    
    for acc_type_id, acc_type_name in results:
        # Set defaults based on account type
        if acc_type_name.lower() == 'savings':
            updates = {
                'min_deposit': 100.0,
                'max_deposit': None,  # No limit
                'min_withdrawal': 10.0,
                'max_withdrawal': None,  # No limit
                'withdrawal_limit_daily': 10000.0,
                'withdrawal_limit_monthly': 100000.0,
                'contribution_frequency': None,
                'min_contribution_amount': None,
                'lock_in_period_days': None,
                'early_withdrawal_penalty_rate': 0.0,
                'loan_parameters': None,
                'is_template': False,
                'version': 1
            }
        elif acc_type_name.lower() == 'rd':
            updates = {
                'min_deposit': 1000.0,
                'max_deposit': None,
                'min_withdrawal': None,  # No withdrawals for RD
                'max_withdrawal': None,
                'withdrawal_limit_daily': None,
                'withdrawal_limit_monthly': None,
                'contribution_frequency': 'monthly',
                'min_contribution_amount': 500.0,
                'lock_in_period_days': None,
                'early_withdrawal_penalty_rate': 2.0,  # 2% penalty
                'loan_parameters': None,
                'is_template': False,
                'version': 1
            }
        elif acc_type_name.lower() == 'fd':
            updates = {
                'min_deposit': 10000.0,
                'max_deposit': None,
                'min_withdrawal': None,  # No withdrawals for FD
                'max_withdrawal': None,
                'withdrawal_limit_daily': None,
                'withdrawal_limit_monthly': None,
                'contribution_frequency': None,
                'min_contribution_amount': None,
                'lock_in_period_days': 365,  # 1 year lock-in
                'early_withdrawal_penalty_rate': 3.0,  # 3% penalty
                'loan_parameters': None,
                'is_template': False,
                'version': 1
            }
        elif acc_type_name.lower() == 'loan':
            updates = {
                'min_deposit': 0.0,  # Set to 0 for loans (can't be NULL)
                'max_deposit': None,
                'min_withdrawal': 0.0,  # Set to 0 for loans (can't be NULL)
                'max_withdrawal': None,
                'withdrawal_limit_daily': None,
                'withdrawal_limit_monthly': None,
                'contribution_frequency': None,
                'min_contribution_amount': None,
                'lock_in_period_days': None,
                'early_withdrawal_penalty_rate': 0.0,
                'loan_parameters': '{"max_loan_amount": 1000000, "min_loan_amount": 10000, "repayment_frequency": "monthly", "penalty_rate": 5.0}',
                'is_template': False,
                'version': 1
            }
        else:
            # Default values for any other account types
            updates = {
                'min_deposit': 0.0,
                'max_deposit': None,
                'min_withdrawal': 0.0,
                'max_withdrawal': None,
                'withdrawal_limit_daily': None,
                'withdrawal_limit_monthly': None,
                'contribution_frequency': None,
                'min_contribution_amount': None,
                'lock_in_period_days': None,
                'early_withdrawal_penalty_rate': 0.0,
                'loan_parameters': None,
                'is_template': False,
                'version': 1
            }

        # Update the record using individual UPDATE statements
        for key, value in updates.items():
            if value is None:
                conn.execute(
                    sa.text(f"UPDATE account_types SET {key} = NULL WHERE id = :id"),
                    {'id': acc_type_id}
                )
            else:
                conn.execute(
                    sa.text(f"UPDATE account_types SET {key} = :value WHERE id = :id"),
                    {'id': acc_type_id, 'value': value}
                )

    # Ensure all records have non-null values for required columns
    conn.execute(sa.text("""
        UPDATE account_types 
        SET 
            min_deposit = COALESCE(min_deposit, 0.0),
            min_withdrawal = COALESCE(min_withdrawal, 0.0),
            early_withdrawal_penalty_rate = COALESCE(early_withdrawal_penalty_rate, 0.0),
            is_template = COALESCE(is_template, false),
            version = COALESCE(version, 1)
        WHERE 
            min_deposit IS NULL OR 
            min_withdrawal IS NULL OR 
            early_withdrawal_penalty_rate IS NULL OR 
            is_template IS NULL OR 
            version IS NULL
    """))

    # Now make the required columns NOT NULL
    with op.batch_alter_table('account_types', schema=None) as batch_op:
        batch_op.alter_column('min_deposit', existing_type=sa.Float(), nullable=False)
        batch_op.alter_column('min_withdrawal', existing_type=sa.Float(), nullable=False)
        batch_op.alter_column('early_withdrawal_penalty_rate', existing_type=sa.Float(), nullable=False)
        batch_op.alter_column('is_template', existing_type=sa.Boolean(), nullable=False)
        batch_op.alter_column('version', existing_type=sa.Integer(), nullable=False)

def downgrade():
    # Remove the added columns
    with op.batch_alter_table('account_types', schema=None) as batch_op:
        batch_op.drop_column('version')
        batch_op.drop_column('is_template')
        batch_op.drop_column('loan_parameters')
        batch_op.drop_column('early_withdrawal_penalty_rate')
        batch_op.drop_column('lock_in_period_days')
        batch_op.drop_column('min_contribution_amount')
        batch_op.drop_column('contribution_frequency')
        batch_op.drop_column('withdrawal_limit_monthly')
        batch_op.drop_column('withdrawal_limit_daily')
        batch_op.drop_column('max_withdrawal')
        batch_op.drop_column('min_withdrawal')
        batch_op.drop_column('max_deposit')
        batch_op.drop_column('min_deposit')
