"""add_account_snapshot_parameters

Revision ID: 33d7dc2348b5
Revises: 4e3b906e2874
Create Date: 2025-11-05 13:33:30.705726

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '33d7dc2348b5'
down_revision = '4e3b906e2874'
branch_labels = None
depends_on = None


def upgrade():
    # Add snapshot fields to accounts table
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        # Snapshot parameters
        batch_op.add_column(sa.Column('snapshot_interest_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_min_deposit', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_max_deposit', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_min_withdrawal', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_max_withdrawal', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_withdrawal_limit_daily', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_withdrawal_limit_monthly', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_deposit_limit_daily', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_deposit_limit_monthly', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_atm_withdrawal_limit_daily', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_minimum_balance', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_low_balance_penalty', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_interest_calculation_method', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('snapshot_interest_calculation_frequency', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('snapshot_early_withdrawal_penalty_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_lock_in_period_days', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_contribution_frequency', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('snapshot_min_contribution_amount', sa.Float(), nullable=True))
        
        # Custom parameters (for overrides)
        batch_op.add_column(sa.Column('custom_interest_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('custom_min_deposit', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('custom_min_withdrawal', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('custom_minimum_balance', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('custom_low_balance_penalty', sa.Float(), nullable=True))
        
        # Flag to indicate if account uses custom parameters
        batch_op.add_column(sa.Column('use_custom_parameters', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create account_parameter_updates table for audit trail
    op.create_table('account_parameter_updates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('updated_by', sa.Integer(), nullable=False),
        sa.Column('parameter_name', sa.String(length=50), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    # Drop account_parameter_updates table
    op.drop_table('account_parameter_updates')
    
    # Remove snapshot fields from accounts table
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_column('use_custom_parameters')
        batch_op.drop_column('custom_low_balance_penalty')
        batch_op.drop_column('custom_minimum_balance')
        batch_op.drop_column('custom_min_withdrawal')
        batch_op.drop_column('custom_min_deposit')
        batch_op.drop_column('custom_interest_rate')
        batch_op.drop_column('snapshot_min_contribution_amount')
        batch_op.drop_column('snapshot_contribution_frequency')
        batch_op.drop_column('snapshot_lock_in_period_days')
        batch_op.drop_column('snapshot_early_withdrawal_penalty_rate')
        batch_op.drop_column('snapshot_interest_calculation_frequency')
        batch_op.drop_column('snapshot_interest_calculation_method')
        batch_op.drop_column('snapshot_low_balance_penalty')
        batch_op.drop_column('snapshot_minimum_balance')
        batch_op.drop_column('snapshot_atm_withdrawal_limit_daily')
        batch_op.drop_column('snapshot_deposit_limit_monthly')
        batch_op.drop_column('snapshot_deposit_limit_daily')
        batch_op.drop_column('snapshot_withdrawal_limit_monthly')
        batch_op.drop_column('snapshot_withdrawal_limit_daily')
        batch_op.drop_column('snapshot_max_withdrawal')
        batch_op.drop_column('snapshot_min_withdrawal')
        batch_op.drop_column('snapshot_max_deposit')
        batch_op.drop_column('snapshot_min_deposit')
        batch_op.drop_column('snapshot_interest_rate')
