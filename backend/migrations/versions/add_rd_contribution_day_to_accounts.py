"""Add rd_contribution_day to accounts table

Revision ID: add_rd_contribution_day
Revises: add_emi_due_day
Create Date: 2025-01-27 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_rd_contribution_day'
down_revision = 'add_emi_due_day'
branch_labels = None
depends_on = None


def upgrade():
    # Add rd_contribution_day column to accounts table
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('rd_contribution_day', sa.Integer(), nullable=True))


def downgrade():
    # Remove rd_contribution_day column
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_column('rd_contribution_day')

