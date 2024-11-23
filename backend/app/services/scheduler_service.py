import asyncio
import schedule
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import BackupJob, ScheduleFrequency
from app.services.backup_service import BackupService

class SchedulerService:
    def __init__(self):
        self.running_jobs: Dict[int, asyncio.Task] = {}
        self.stop_flag = False

    async def start(self):
        """Start the scheduler service"""
        self.stop_flag = False
        while not self.stop_flag:
            self._schedule_pending_jobs()
            await asyncio.sleep(60)  # Check for new jobs every minute

    async def stop(self):
        """Stop the scheduler service"""
        self.stop_flag = True
        for job_id, task in self.running_jobs.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        self.running_jobs.clear()

    def _schedule_pending_jobs(self):
        """Schedule any pending backup jobs"""
        db = SessionLocal()
        try:
            jobs = db.query(BackupJob).filter(
                BackupJob.is_active == True,
                (BackupJob.next_run <= datetime.utcnow()) | (BackupJob.next_run == None)
            ).all()

            for job in jobs:
                if job.id not in self.running_jobs:
                    self._schedule_job(job)
                    
        finally:
            db.close()

    def _schedule_job(self, job: BackupJob):
        """Schedule a specific backup job"""
        if job.frequency == ScheduleFrequency.DAILY:
            schedule_time = self._get_next_run_time(job, days=1)
        elif job.frequency == ScheduleFrequency.WEEKLY:
            schedule_time = self._get_next_run_time(job, days=7)
        elif job.frequency == ScheduleFrequency.MONTHLY:
            schedule_time = self._get_next_run_time(job, days=30)
        else:
            return

        # Update next run time
        db = SessionLocal()
        try:
            job.next_run = schedule_time
            db.commit()
        finally:
            db.close()

        # Schedule the backup task
        task = asyncio.create_task(self._run_backup(job.id))
        self.running_jobs[job.id] = task

    async def _run_backup(self, job_id: int):
        """Execute a backup job"""
        db = SessionLocal()
        try:
            backup_service = BackupService(db)
            await backup_service.create_backup(job_id)
        except Exception as e:
            print(f"Error executing backup job {job_id}: {str(e)}")
        finally:
            db.close()
            if job_id in self.running_jobs:
                del self.running_jobs[job_id]

    def _get_next_run_time(self, job: BackupJob, days: int) -> datetime:
        """Calculate the next run time for a job"""
        if job.last_run:
            next_run = job.last_run + timedelta(days=days)
            if next_run < datetime.utcnow():
                next_run = datetime.utcnow() + timedelta(minutes=5)  # Schedule soon if overdue
        else:
            next_run = datetime.utcnow() + timedelta(minutes=5)  # Schedule soon for first run
        
        return next_run

    async def reschedule_job(self, job_id: int):
        """Reschedule a specific job"""
        db = SessionLocal()
        try:
            job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
            if job and job.is_active:
                if job_id in self.running_jobs:
                    self.running_jobs[job_id].cancel()
                    del self.running_jobs[job_id]
                self._schedule_job(job)
        finally:
            db.close()

    async def pause_job(self, job_id: int):
        """Pause a scheduled job"""
        if job_id in self.running_jobs:
            self.running_jobs[job_id].cancel()
            del self.running_jobs[job_id]

    async def resume_job(self, job_id: int):
        """Resume a paused job"""
        db = SessionLocal()
        try:
            job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
            if job and job.is_active and job_id not in self.running_jobs:
                self._schedule_job(job)
        finally:
            db.close()

# Global scheduler instance
scheduler = SchedulerService()

async def start_scheduler():
    """Start the global scheduler service"""
    await scheduler.start()

async def stop_scheduler():
    """Stop the global scheduler service"""
    await scheduler.stop()
