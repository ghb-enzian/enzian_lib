#!/bin/bash
set -e

# Display welcome message
echo "Installing enzian-lib..."

# Check Python version
python_version=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
required_version="3.12"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "Error: Python $required_version or higher is required (you have $python_version)"
    exit 1
fi

# Create and activate virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Determine activation script based on shell
if [ -n "$BASH_VERSION" ]; then
    source .venv/bin/activate
elif [ -n "$ZSH_VERSION" ]; then
    source .venv/bin/activate
else
    echo "Please activate the virtual environment manually."
    echo "Run: source .venv/bin/activate"
    exit 1
fi

# Install the package in development mode
echo "Installing dependencies..."
pip install --upgrade pip
pip install -e .

echo "Installation complete! enzian-lib has been installed in development mode."
echo "You can now use the library in your Python projects."