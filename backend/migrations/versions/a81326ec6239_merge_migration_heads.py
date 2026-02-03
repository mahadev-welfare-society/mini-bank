"""Merge migration heads

Revision ID: a81326ec6239
Revises: 8e70dfb4b5f3, enhanced_accounttype_custom
Create Date: 2025-10-25 13:18:43.656540

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a81326ec6239'
down_revision = ('8e70dfb4b5f3', 'enhanced_accounttype_custom')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
