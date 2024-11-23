# SQL Server Backup Automation System

A comprehensive web-based system for automating SQL Server database backups with cloud storage integration. Built with FastAPI, React, and SQL Server, designed for easy deployment and management of database backups.

## Features

- **Automated Backup Scheduling**

  - Daily/Weekly/Monthly scheduling
  - Full and differential backups
  - Configurable retention policies
  - Real-time backup monitoring

- **Cloud Storage Integration**

  - Dropbox integration for backup storage
  - Automatic file organization
  - Storage usage monitoring
  - Configurable retention policies

- **Web Interface**

  - Modern, responsive dashboard
  - Real-time backup status monitoring
  - Storage usage metrics
  - Comprehensive backup history

- **Security**

  - JWT-based authentication
  - Role-based access control
  - Secure password handling
  - HTTPS support

- **Notifications**
  - Email alerts for backup status
  - Storage usage warnings
  - System status notifications
  - Customizable notification settings

## Tech Stack

- **Backend**

  - FastAPI (Python)
  - SQLAlchemy ORM
  - SQL Server
  - JWT Authentication
  - Dropbox API

- **Frontend**

  - React
  - Material-UI
  - React Router
  - Axios
  - Chart.js

- **Database**

  - Microsoft SQL Server

- **Deployment**
  - Docker
  - Docker Compose
  - Nginx

## Prerequisites

- Docker and Docker Compose
- SQL Server 2019 or later
- Dropbox account (for cloud storage)
- SMTP server (for notifications)

## Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/sql-backup-system.git
   cd sql-backup-system
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Build and start the containers:

   ```bash
   docker-compose up -d
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Configuration

### Environment Variables

Key environment variables to configure:

- \`DATABASE_URL\`: SQL Server connection string
- \`SECRET_KEY\`: JWT secret key
- \`DROPBOX_ACCESS_TOKEN\`: Dropbox API access token
- \`SMTP\_\*\`: Email notification settings

See \`.env.example\` for all available options.

### Backup Configuration

Configure backup settings through the web interface:

1. Set up database connections
2. Configure backup schedules
3. Set retention policies
4. Configure notification preferences

## Development Setup

### Backend Development

1. Create a Python virtual environment:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Development

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

## Deployment

### Docker Deployment

1. Configure environment variables in \`.env\`
2. Build and start containers:
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. Set up SQL Server
2. Configure backend:

   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app
   ```

3. Build and serve frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   # Serve using nginx or preferred web server
   ```

## Security Considerations

- Use strong passwords
- Enable HTTPS in production
- Regularly update dependencies
- Configure proper firewall rules
- Use secure SMTP settings
- Implement proper backup encryption

## Monitoring

The system provides several monitoring features:

- Real-time backup status
- Storage usage metrics
- System health monitoring
- Email notifications
- Audit logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation

## Acknowledgments

- FastAPI framework
- React and Material-UI
- SQL Server team
- Dropbox API
- Open source community

## Project Structure

```
sql-backup-system/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   └── services/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
