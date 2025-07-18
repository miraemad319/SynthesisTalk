from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    USERNAME: Optional[str]
    PASSWORD: Optional[str]
    HOST: Optional[str]
    PORT: Optional[int]
    DB_NAME: Optional[str]
    DATABASE_URL: Optional[str]

    OPENAI_API_KEY: Optional[str]
    OPENAI_MODEL: Optional[str]

    GROQ_API_KEY: Optional[str]
    GROQ_BASE_URL: Optional[str]
    GROQ_MODEL: Optional[str]
    
    NGU_API_KEY: Optional[str]
    NGU_BASE_URL: Optional[str]
    NGU_MODEL: Optional[str]

    GOOGLE_SEARCH_API_KEY: Optional[str]
    GOOGLE_CSE_ID: Optional[str]
    GOOGLE_URL: Optional[str]

    SERPAPI_API_KEY: Optional[str]
    SERPAPI_URL: Optional[str]

    class Config:
        env_file = ".env"

settings = Settings()
