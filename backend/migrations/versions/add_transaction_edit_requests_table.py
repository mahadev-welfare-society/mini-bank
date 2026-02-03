"""Add transaction_edit_requests table for transaction edit request workflow

Revision ID: add_transaction_edit_requests
Revises: add_emi_installments
Create Date: 2025-11-25 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_transaction_edit_requests'
down_revision = 'add_emi_installments'
branch_labels = None
depends_on = None


def upgrade():
    # Create transaction_edit_requests table
    op.create_table('transaction_edit_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transaction_id', sa.Integer(), nullable=False),
        sa.Column('requested_amount', sa.Float(), nullable=False),
        sa.Column('requested_description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('requested_by', sa.Integer(), nullable=False),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index on transaction_id and status for faster queries
    op.create_index('idx_edit_request_transaction_status', 'transaction_edit_requests', ['transaction_id', 'status'])
    op.create_index('idx_edit_request_status', 'transaction_edit_requests', ['status'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_edit_request_status', table_name='transaction_edit_requests')
    op.drop_index('idx_edit_request_transaction_status', table_name='transaction_edit_requests')
    
    # Drop table
    op.drop_table('transaction_edit_requests')

