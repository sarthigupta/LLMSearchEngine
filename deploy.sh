#!/bin/bash
set -e

echo "Starting deployment setup..."

# 1. Update system and install Docker
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 2. Start and enable Docker
sudo systemctl enable docker
sudo systemctl start docker

# 3. Add ubuntu user to docker group (so you don't need sudo for docker)
sudo usermod -aG docker ubuntu

# 4. Pull and start the application
echo "Starting the application using Docker Compose..."
sudo docker compose up -d --build

echo ""
echo "==========================================================="
echo "Deployment successful! 🚀"
echo "Your API is now running on port 8000."
echo "Make sure to open Port 8000 in your AWS EC2 Security Group."
echo "==========================================================="
