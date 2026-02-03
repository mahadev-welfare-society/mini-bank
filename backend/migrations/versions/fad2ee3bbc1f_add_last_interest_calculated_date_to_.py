"""add_last_interest_calculated_date_to_accounts

Revision ID: fad2ee3bbc1f
Revises: 3bde51591e84
Create Date: 2025-11-05 15:21:52.595241

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fad2ee3bbc1f'
down_revision = '3bde51591e84'
branch_labels = None
depends_on = None


def upgrade():
    # Add last_interest_calculated_date to track when interest was last calculated
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_interest_calculated_date', sa.Date(), nullable=True))


def downgrade():
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_column('last_interest_calculated_date')
