"""merge heads for assigned_manager

Revision ID: 4e3b906e2874
Revises: 53bee4ae2636, add_assigned_manager
Create Date: 2025-11-04 18:25:04.390180

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4e3b906e2874'
down_revision = ('53bee4ae2636', 'add_assigned_manager')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
