"""add old_amount to transaction_edit_requests

Revision ID: add_old_amount_to_edit_requests
Revises: 
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_old_amount_to_edit_requests'
down_revision = 'add_transaction_edit_requests'
branch_labels = None
depends_on = None


def upgrade():
    # Add old_amount column to transaction_edit_requests table
    op.add_column('transaction_edit_requests', 
                   sa.Column('old_amount', sa.Float(), nullable=True))


def downgrade():
    # Remove old_amount column
    op.drop_column('transaction_edit_requests', 'old_amount')

