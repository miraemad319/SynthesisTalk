"""Inital migration

Revision ID: 11cbdc72460f
Revises: 
Create Date: 2025-07-15 01:43:28.102443

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '11cbdc72460f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('document', sa.Column('embedding_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'document', 'embedding', ['embedding_id'], ['id'])
    op.add_column('message', sa.Column('embedding_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'message', 'embedding', ['embedding_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'message', type_='foreignkey')
    op.drop_column('message', 'embedding_id')
    op.drop_constraint(None, 'document', type_='foreignkey')
    op.drop_column('document', 'embedding_id')
    # ### end Alembic commands ###
