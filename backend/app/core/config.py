from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SQL Backup System"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Database
    DATABASE_URL: Optional[str] = None
    SQL_SERVER_HOST: Optional[str] = None
    SQL_SERVER_DATABASE: Optional[str] = None
    SQL_SERVER_USER: Optional[str] = None
    SQL_SERVER_PASSWORD: Optional[str] = None
    
    # Cloud Storage
    DROPBOX_ACCESS_TOKEN: Optional[str] = None
    BACKUP_STORAGE_PATH: str = "/backups"
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # Backup Settings
    BACKUP_RETENTION_DAYS: int = 30
    MAX_BACKUP_SIZE_MB: int = 1000
    
    class Config:
        env_file = ".env"

settings = Settings()
