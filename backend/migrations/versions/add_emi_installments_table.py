"""Add EMI installments table for tracking loan EMI payments

Revision ID: add_emi_installments
Revises: fb4b538d3a81
Create Date: 2025-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_emi_installments'
down_revision = 'add_rd_contribution_day'  # Latest migration in the chain
branch_labels = None
depends_on = None


def upgrade():
    # Create emi_installments table
    op.create_table('emi_installments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('emi_number', sa.Integer(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('emi_amount', sa.Float(), nullable=False),
        sa.Column('principal_component', sa.Float(), nullable=False),
        sa.Column('interest_component', sa.Float(), nullable=False),
        sa.Column('remaining_principal_before', sa.Float(), nullable=False),
        sa.Column('remaining_principal_after', sa.Float(), nullable=False),
        sa.Column('is_paid', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('paid_amount', sa.Float(), nullable=True),
        sa.Column('paid_date', sa.Date(), nullable=True),
        sa.Column('transaction_id', sa.Integer(), nullable=True),
        sa.Column('is_overdue', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_id', 'emi_number', name='uq_account_emi_number')
    )
    
    # Create index on account_id and due_date for faster queries
    op.create_index('idx_emi_account_due_date', 'emi_installments', ['account_id', 'due_date'])
    op.create_index('idx_emi_account_paid', 'emi_installments', ['account_id', 'is_paid'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_emi_account_paid', table_name='emi_installments')
    op.drop_index('idx_emi_account_due_date', table_name='emi_installments')
    
    # Drop table
    op.drop_table('emi_installments')

