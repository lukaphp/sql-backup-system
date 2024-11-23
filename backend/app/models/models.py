from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from .base import BaseModel, TimestampMixin

class BackupType(enum.Enum):
    FULL = "full"
    DIFFERENTIAL = "differential"

class BackupStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class ScheduleFrequency(enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class User(BaseModel, TimestampMixin):
    __tablename__ = "users"

    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    backup_jobs = relationship("BackupJob", back_populates="user")

class Database(BaseModel, TimestampMixin):
    __tablename__ = "databases"

    name = Column(String, nullable=False)
    server = Column(String, nullable=False)
    connection_string = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    backup_jobs = relationship("BackupJob", back_populates="database")

class BackupJob(BaseModel, TimestampMixin):
    __tablename__ = "backup_jobs"

    database_id = Column(Integer, ForeignKey("databases.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    backup_type = Column(Enum(BackupType), nullable=False)
    frequency = Column(Enum(ScheduleFrequency), nullable=False)
    retention_days = Column(Integer, default=30)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    database = relationship("Database", back_populates="backup_jobs")
    user = relationship("User", back_populates="backup_jobs")
    backups = relationship("Backup", back_populates="backup_job")

class Backup(BaseModel, TimestampMixin):
    __tablename__ = "backups"

    backup_job_id = Column(Integer, ForeignKey("backup_jobs.id"))
    status = Column(Enum(BackupStatus), nullable=False, default=BackupStatus.PENDING)
    file_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)  # in bytes
    cloud_storage_path = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    
    backup_job = relationship("BackupJob", back_populates="backups")

class NotificationSettings(BaseModel, TimestampMixin):
    __tablename__ = "notification_settings"

    user_id = Column(Integer, ForeignKey("users.id"))
    email_notifications = Column(Boolean, default=True)
    backup_success = Column(Boolean, default=True)
    backup_failure = Column(Boolean, default=True)
    storage_warning = Column(Boolean, default=True)
    
    user = relationship("User")
