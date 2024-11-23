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

# Make scripts executable
make_scripts_executable() {
    print_message "Making scripts executable..." "$YELLOW"
    chmod +x setup.sh dev.sh docker.sh
    print_message "Scripts are now executable!" "$GREEN"
}

# Initialize git repository
init_git() {
    print_message "Initializing git repository..." "$YELLOW"
    
    if [ -d ".git" ]; then
        print_message "Git repository already initialized" "$YELLOW"
    else
        git init
        git add .
        git commit -m "Initial commit"
        print_message "Git repository initialized!" "$GREEN"
    fi
}

# Create necessary directories
create_directories() {
    print_message "Creating necessary directories..." "$YELLOW"
    
    # Backend directories
    mkdir -p backend/backups
    mkdir -p backend/logs
    
    # Frontend directories
    mkdir -p frontend/public
    mkdir -p frontend/src/assets
    mkdir -p frontend/src/components/common
    mkdir -p frontend/src/hooks
    mkdir -p frontend/src/utils
    
    print_message "Directories created!" "$GREEN"
}

# Create initial public files
create_public_files() {
    print_message "Creating public files..." "$YELLOW"
    
    # Create index.html if it doesn't exist
    if [ ! -f "frontend/public/index.html" ]; then
        cat > frontend/public/index.html << EOL
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="SQL Server Backup Automation System" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>SQL Backup System</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOL
    fi
    
    # Create manifest.json if it doesn't exist
    if [ ! -f "frontend/public/manifest.json" ]; then
        cat > frontend/public/manifest.json << EOL
{
  "short_name": "SQL Backup",
  "name": "SQL Server Backup System",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
EOL
    fi
    
    # Create robots.txt if it doesn't exist
    if [ ! -f "frontend/public/robots.txt" ]; then
        cat > frontend/public/robots.txt << EOL
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow:
EOL
    fi
    
    print_message "Public files created!" "$GREEN"
}

# Initialize environment
init_env() {
    print_message "Initializing environment..." "$YELLOW"
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_message "Created .env file from example" "$GREEN"
    else
        print_message ".env file already exists" "$YELLOW"
    fi
}

# Main initialization process
main() {
    print_message "Starting SQL Backup System initialization..." "$YELLOW"
    
    # Make scripts executable
    make_scripts_executable
    
    # Initialize git repository
    init_git
    
    # Create directories
    create_directories
    
    # Create public files
    create_public_files
    
    # Initialize environment
    init_env
    
    # Final instructions
    echo
    print_message "Initialization completed successfully!" "$GREEN"
    echo
    print_message "Next steps:" "$YELLOW"
    echo "1. Edit the .env file with your configuration"
    echo "2. Run './setup.sh' to set up the development environment"
    echo "3. Use './dev.sh start' to start development servers"
    echo "4. Use './docker.sh start' to start Docker containers"
    echo
    print_message "Available scripts:" "$YELLOW"
    echo "- setup.sh  : Set up development environment"
    echo "- dev.sh    : Development tasks (start, test, lint, etc.)"
    echo "- docker.sh : Docker operations (start, stop, rebuild, etc.)"
    echo
    print_message "For more information, check the README.md file" "$GREEN"
}

# Run main initialization
main
