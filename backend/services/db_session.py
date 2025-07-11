from sqlmodel import create_engine, SQLModel, Session
from settings.settings import settings
from models import db_models

# Use full DATABASE_URL if defined
if settings.DATABASE_URL:
    db_url = settings.DATABASE_URL
else:
    db_url = f"postgresql://{settings.USERNAME}:{settings.PASSWORD}@{settings.HOST}:{settings.PORT}/{settings.DB_NAME}"

engine = create_engine(db_url, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)

