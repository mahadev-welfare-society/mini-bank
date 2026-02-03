"""Update admin password hash to scrypt

Revision ID: 53bee4ae2636
Revises: 0cb1e75b354d
Create Date: 2025-10-28 15:00:25.689869

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '53bee4ae2636'
down_revision = '0cb1e75b354d'
branch_labels = None
depends_on = None


def upgrade():
    # Update admin user password to use scrypt hash for 'admin123'
    op.execute(text("""
        UPDATE users 
        SET password_hash = 'scrypt:32768:8:1$PTqaPtStPjfar3Wc$75b81f79eae5e42fadcac3bde73e107061c0f3905ee052999be452e2f408704edb3e915871060255c75c573adcba4c59617699fbd9976e6d4b4c0de37392412c'
        WHERE email = 'admin@minibank.com';
    """))


def downgrade():
    pass
