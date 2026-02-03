"""merge_heads_for_account_snapshot

Revision ID: 3bde51591e84
Revises: 8459c1d41762
Create Date: 2025-11-05 13:52:21.097979

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3bde51591e84'
down_revision = ('33d7dc2348b5', '8459c1d41762')  # Merge both heads
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
