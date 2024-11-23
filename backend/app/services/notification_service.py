import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Backup, NotificationSettings, User

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.smtp_config = {
            'hostname': settings.SMTP_HOST,
            'port': settings.SMTP_PORT,
            'username': settings.SMTP_USER,
            'password': settings.SMTP_PASSWORD,
            'use_tls': True
        }

    async def send_backup_success_notification(self, backup: Backup):
        """Send notification for successful backup completion"""
        if not backup.backup_job.user:
            return

        notification_settings = self.db.query(NotificationSettings).filter(
            NotificationSettings.user_id == backup.backup_job.user_id
        ).first()

        if not notification_settings or not notification_settings.backup_success:
            return

        subject = f"Backup Completed Successfully - {backup.backup_job.database.name}"
        body = self._create_success_email_body(backup)
        
        await self._send_email(
            recipient=backup.backup_job.user.email,
            subject=subject,
            body=body
        )

    async def send_backup_failure_notification(self, backup: Backup):
        """Send notification for failed backup"""
        if not backup.backup_job.user:
            return

        notification_settings = self.db.query(NotificationSettings).filter(
            NotificationSettings.user_id == backup.backup_job.user_id
        ).first()

        if not notification_settings or not notification_settings.backup_failure:
            return

        subject = f"Backup Failed - {backup.backup_job.database.name}"
        body = self._create_failure_email_body(backup)
        
        await self._send_email(
            recipient=backup.backup_job.user.email,
            subject=subject,
            body=body
        )

    async def send_storage_warning(self, user: User, usage_percentage: float):
        """Send notification for storage usage warning"""
        notification_settings = self.db.query(NotificationSettings).filter(
            NotificationSettings.user_id == user.id
        ).first()

        if not notification_settings or not notification_settings.storage_warning:
            return

        subject = "Storage Usage Warning"
        body = self._create_storage_warning_body(usage_percentage)
        
        await self._send_email(
            recipient=user.email,
            subject=subject,
            body=body
        )

    def _create_success_email_body(self, backup: Backup) -> str:
        """Create email body for successful backup"""
        return f"""
        <html>
            <body>
                <h2>Backup Completed Successfully</h2>
                <p>Database: {backup.backup_job.database.name}</p>
                <p>Backup Type: {backup.backup_job.backup_type.value}</p>
                <p>Started: {backup.started_at}</p>
                <p>Completed: {backup.completed_at}</p>
                <p>File Size: {self._format_file_size(backup.file_size)}</p>
                <p>Cloud Storage Path: {backup.cloud_storage_path}</p>
            </body>
        </html>
        """

    def _create_failure_email_body(self, backup: Backup) -> str:
        """Create email body for failed backup"""
        return f"""
        <html>
            <body>
                <h2>Backup Failed</h2>
                <p>Database: {backup.backup_job.database.name}</p>
                <p>Backup Type: {backup.backup_job.backup_type.value}</p>
                <p>Started: {backup.started_at}</p>
                <p>Error: {backup.error_message}</p>
                <p>Please check the system logs for more details.</p>
            </body>
        </html>
        """

    def _create_storage_warning_body(self, usage_percentage: float) -> str:
        """Create email body for storage warning"""
        return f"""
        <html>
            <body>
                <h2>Storage Usage Warning</h2>
                <p>Your backup storage usage has reached {usage_percentage:.1f}%</p>
                <p>Please consider cleaning up old backups or increasing storage capacity.</p>
            </body>
        </html>
        """

    async def _send_email(self, recipient: str, subject: str, body: str):
        """Send email using configured SMTP server"""
        message = MIMEMultipart("alternative")
        message["From"] = settings.SMTP_USER
        message["To"] = recipient
        message["Subject"] = subject

        html_part = MIMEText(body, "html")
        message.attach(html_part)

        try:
            async with aiosmtplib.SMTP(**self.smtp_config) as smtp:
                await smtp.send_message(message)
        except Exception as e:
            print(f"Failed to send email notification: {str(e)}")

    def _format_file_size(self, size_in_bytes: int) -> str:
        """Format file size in human-readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_in_bytes < 1024:
                return f"{size_in_bytes:.2f} {unit}"
            size_in_bytes /= 1024
        return f"{size_in_bytes:.2f} TB"
