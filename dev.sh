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

# Function to start development servers
start_dev() {
    print_message "Starting development servers..." "$YELLOW"
    
    # Start backend
    print_message "Starting backend server..." "$YELLOW"
    cd backend
    source venv/bin/activate || source venv/Scripts/activate
    uvicorn app.main:app --reload --port 8000 &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend
    print_message "Starting frontend server..." "$YELLOW"
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    print_message "Development servers started!" "$GREEN"
    print_message "Backend running at: http://localhost:8000" "$GREEN"
    print_message "Frontend running at: http://localhost:3000" "$GREEN"
    
    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
}

# Function to run tests
run_tests() {
    print_message "Running tests..." "$YELLOW"
    
    # Backend tests
    print_message "Running backend tests..." "$YELLOW"
    cd backend
    source venv/bin/activate || source venv/Scripts/activate
    python -m pytest
    BACKEND_TEST_STATUS=$?
    cd ..
    
    # Frontend tests
    print_message "Running frontend tests..." "$YELLOW"
    cd frontend
    npm test
    FRONTEND_TEST_STATUS=$?
    cd ..
    
    # Check test results
    if [ $BACKEND_TEST_STATUS -eq 0 ] && [ $FRONTEND_TEST_STATUS -eq 0 ]; then
        print_message "All tests passed!" "$GREEN"
    else
        print_message "Some tests failed!" "$RED"
        exit 1
    fi
}

# Function to lint code
lint_code() {
    print_message "Linting code..." "$YELLOW"
    
    # Backend linting
    print_message "Linting backend code..." "$YELLOW"
    cd backend
    source venv/bin/activate || source venv/Scripts/activate
    flake8 .
    BACKEND_LINT_STATUS=$?
    cd ..
    
    # Frontend linting
    print_message "Linting frontend code..." "$YELLOW"
    cd frontend
    npm run lint
    FRONTEND_LINT_STATUS=$?
    cd ..
    
    # Check lint results
    if [ $BACKEND_LINT_STATUS -eq 0 ] && [ $FRONTEND_LINT_STATUS -eq 0 ]; then
        print_message "Linting passed!" "$GREEN"
    else
        print_message "Linting failed!" "$RED"
        exit 1
    fi
}

# Function to format code
format_code() {
    print_message "Formatting code..." "$YELLOW"
    
    # Backend formatting
    print_message "Formatting backend code..." "$YELLOW"
    cd backend
    source venv/bin/activate || source venv/Scripts/activate
    black .
    cd ..
    
    # Frontend formatting
    print_message "Formatting frontend code..." "$YELLOW"
    cd frontend
    npm run format
    cd ..
    
    print_message "Code formatting completed!" "$GREEN"
}

# Function to build for production
build_prod() {
    print_message "Building for production..." "$YELLOW"
    
    # Build frontend
    print_message "Building frontend..." "$YELLOW"
    cd frontend
    npm run build
    cd ..
    
    # Build backend (if needed)
    print_message "Building backend..." "$YELLOW"
    cd backend
    source venv/bin/activate || source venv/Scripts/activate
    # Add any backend build steps here
    cd ..
    
    print_message "Production build completed!" "$GREEN"
}

# Function to clean development environment
clean_dev() {
    print_message "Cleaning development environment..." "$YELLOW"
    
    # Clean backend
    cd backend
    rm -rf __pycache__
    rm -rf .pytest_cache
    rm -rf build/
    rm -rf dist/
    rm -rf *.egg-info
    cd ..
    
    # Clean frontend
    cd frontend
    rm -rf build/
    rm -rf node_modules/
    cd ..
    
    print_message "Development environment cleaned!" "$GREEN"
}

# Main menu
main() {
    case "$1" in
        start)
            start_dev
            ;;
        test)
            run_tests
            ;;
        lint)
            lint_code
            ;;
        format)
            format_code
            ;;
        build)
            build_prod
            ;;
        clean)
            clean_dev
            ;;
        *)
            print_message "SQL Backup System Development Script" "$YELLOW"
            echo
            echo "Usage: $0 [command]"
            echo
            echo "Commands:"
            echo "  start   - Start development servers"
            echo "  test    - Run all tests"
            echo "  lint    - Lint code"
            echo "  format  - Format code"
            echo "  build   - Build for production"
            echo "  clean   - Clean development environment"
            ;;
    esac
}

# Run main function with provided arguments
main "$@"
