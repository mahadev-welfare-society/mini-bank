"""Add is_active field to Customer

Revision ID: 201fb82ed493
Revises: add_dds_account_type
Create Date: 2025-12-03 19:18:03.642136
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '201fb82ed493'
down_revision = 'add_dds_account_type'
branch_labels = None
depends_on = None

def upgrade():
    # Add is_active column with default True for existing rows
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true())
        )
        # Remove server_default so future inserts rely on model default
        batch_op.alter_column('is_active', server_default=None)

def downgrade():
    # Remove is_active column
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.drop_column('is_active')
