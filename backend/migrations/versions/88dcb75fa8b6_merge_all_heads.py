"""merge all heads

Revision ID: 88dcb75fa8b6
Revises: 7dac59751afc, a1b2c3d4e5f6, b6ba66c02905
Create Date: 2025-12-31 11:34:15.366584

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '88dcb75fa8b6'
down_revision = ('7dac59751afc', 'a1b2c3d4e5f6', 'b6ba66c02905')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
