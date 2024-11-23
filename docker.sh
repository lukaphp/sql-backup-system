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

# Function to start containers
start() {
    print_message "Starting containers..." "$YELLOW"
    docker-compose up -d
    print_message "Containers started!" "$GREEN"
    print_message "Frontend: http://localhost:3000" "$GREEN"
    print_message "Backend: http://localhost:8000" "$GREEN"
    print_message "API Docs: http://localhost:8000/docs" "$GREEN"
}

# Function to stop containers
stop() {
    print_message "Stopping containers..." "$YELLOW"
    docker-compose down
    print_message "Containers stopped!" "$GREEN"
}

# Function to rebuild containers
rebuild() {
    print_message "Rebuilding containers..." "$YELLOW"
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    print_message "Containers rebuilt and started!" "$GREEN"
}

# Function to show container logs
logs() {
    if [ "$1" ]; then
        docker-compose logs -f "$1"
    else
        docker-compose logs -f
    fi
}

# Function to show container status
status() {
    print_message "Container Status:" "$YELLOW"
    docker-compose ps
}

# Function to clean Docker environment
clean() {
    print_message "Cleaning Docker environment..." "$YELLOW"
    
    # Stop containers
    docker-compose down
    
    # Remove volumes
    if [ "$1" == "--volumes" ] || [ "$1" == "-v" ]; then
        print_message "Removing volumes..." "$YELLOW"
        docker-compose down -v
    fi
    
    # Remove unused images
    print_message "Removing unused images..." "$YELLOW"
    docker image prune -f
    
    # Remove unused volumes
    print_message "Removing unused volumes..." "$YELLOW"
    docker volume prune -f
    
    print_message "Docker environment cleaned!" "$GREEN"
}

# Function to execute command in container
exec_container() {
    if [ "$1" ] && [ "$2" ]; then
        docker-compose exec "$1" "${@:2}"
    else
        print_message "Please specify container and command" "$RED"
        exit 1
    fi
}

# Function to show container shell
shell() {
    case "$1" in
        backend)
            docker-compose exec backend /bin/bash
            ;;
        frontend)
            docker-compose exec frontend /bin/sh
            ;;
        db)
            docker-compose exec db /bin/bash
            ;;
        *)
            print_message "Please specify a valid container (backend, frontend, or db)" "$RED"
            exit 1
            ;;
    esac
}

# Main menu
main() {
    case "$1" in
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            stop
            start
            ;;
        rebuild)
            rebuild
            ;;
        logs)
            logs "$2"
            ;;
        status)
            status
            ;;
        clean)
            clean "$2"
            ;;
        exec)
            shift
            exec_container "$@"
            ;;
        shell)
            shell "$2"
            ;;
        *)
            print_message "SQL Backup System Docker Management Script" "$YELLOW"
            echo
            echo "Usage: $0 [command]"
            echo
            echo "Commands:"
            echo "  start             - Start containers"
            echo "  stop              - Stop containers"
            echo "  restart           - Restart containers"
            echo "  rebuild           - Rebuild and start containers"
            echo "  logs [container]  - Show container logs (all if not specified)"
            echo "  status            - Show container status"
            echo "  clean [-v]        - Clean Docker environment (-v to remove volumes)"
            echo "  exec [container] [command] - Execute command in container"
            echo "  shell [container] - Open shell in container (backend, frontend, or db)"
            ;;
    esac
}

# Make scripts executable
chmod +x setup.sh dev.sh

# Run main function with provided arguments
main "$@"
