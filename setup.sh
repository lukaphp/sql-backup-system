#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    echo -e "${2}${1}${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_message "Checking prerequisites..." "$YELLOW"
    
    # Check Docker
    if ! command_exists docker; then
        print_message "Docker is not installed. Please install Docker first." "$RED"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose; then
        print_message "Docker Compose is not installed. Please install Docker Compose first." "$RED"
        exit 1
    }
    
    # Check Python
    if ! command_exists python3; then
        print_message "Python 3 is not installed. Please install Python 3 first." "$RED"
        exit 1
    }
    
    # Check Node.js
    if ! command_exists node; then
        print_message "Node.js is not installed. Please install Node.js first." "$RED"
        exit 1
    }
    
    print_message "All prerequisites are met!" "$GREEN"
}

# Create environment files
setup_environment() {
    print_message "Setting up environment files..." "$YELLOW"
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_message "Created .env file from example" "$GREEN"
    else
        print_message ".env file already exists" "$YELLOW"
    fi
}

# Setup backend
setup_backend() {
    print_message "Setting up backend..." "$YELLOW"
    
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_message "Created Python virtual environment" "$GREEN"
    fi
    
    # Activate virtual environment
    source venv/bin/activate || source venv/Scripts/activate
    
    # Install dependencies
    pip install -r requirements.txt
    
    # Create necessary directories
    mkdir -p backups
    
    cd ..
    print_message "Backend setup completed!" "$GREEN"
}

# Setup frontend
setup_frontend() {
    print_message "Setting up frontend..." "$YELLOW"
    
    cd frontend
    
    # Install dependencies
    npm install
    
    cd ..
    print_message "Frontend setup completed!" "$GREEN"
}

# Build Docker containers
build_containers() {
    print_message "Building Docker containers..." "$YELLOW"
    
    docker-compose build
    
    print_message "Docker containers built successfully!" "$GREEN"
}

# Main setup process
main() {
    print_message "Starting SQL Backup System setup..." "$YELLOW"
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    setup_environment
    
    # Prompt user for setup type
    echo
    print_message "Please select setup type:" "$YELLOW"
    echo "1. Development setup (local environment)"
    echo "2. Production setup (Docker only)"
    echo "3. Full setup (both local and Docker)"
    read -p "Enter your choice (1-3): " setup_choice
    
    case $setup_choice in
        1)
            setup_backend
            setup_frontend
            ;;
        2)
            build_containers
            ;;
        3)
            setup_backend
            setup_frontend
            build_containers
            ;;
        *)
            print_message "Invalid choice" "$RED"
            exit 1
            ;;
    esac
    
    # Final instructions
    echo
    print_message "Setup completed successfully!" "$GREEN"
    echo
    print_message "Next steps:" "$YELLOW"
    echo "1. Edit the .env file with your configuration"
    echo "2. For development:"
    echo "   - Backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
    echo "   - Frontend: cd frontend && npm start"
    echo "3. For production:"
    echo "   - Run: docker-compose up -d"
    echo
    print_message "Access the application at:" "$YELLOW"
    echo "- Frontend: http://localhost:3000"
    echo "- Backend API: http://localhost:8000"
    echo "- API Documentation: http://localhost:8000/docs"
}

# Run main setup
main
