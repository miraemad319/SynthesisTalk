from sqlmodel import create_engine, SQLModel, Session
from settings.settings import settings
from models import db_models

# Use full DATABASE_URL if defined
if settings.DATABASE_URL:
    db_url = settings.DATABASE_URL
else:
    db_url = f"postgresql://{settings.USERNAME}:{settings.PASSWORD}@{settings.HOST}:{settings.PORT}/{settings.DB_NAME}"

engine = create_engine(
    db_url,
    echo=True,
    pool_size=3,         # Lower pool size to avoid hitting free-tier limits
    max_overflow=0,      # Do not allow more than pool_size connections
)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

