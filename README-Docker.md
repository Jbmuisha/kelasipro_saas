# Kelasipro SaaS - Docker Setup

This guide provides instructions for running the Kelasipro SaaS application using Docker.

## 🐳 Quick Start

### Prerequisites

- Docker
- Docker Compose

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kelasipro-saas
   ```

2. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

4. **View logs**
   ```bash
   docker-compose logs -f
   ```

## 📁 Project Structure

```
kelasipro-saas/
├── Dockerfile              # Multi-stage production build
├── Dockerfile.prod         # Production-specific build
├── Dockerfile.frontend     # Frontend development
├── docker-compose.yml      # Main compose file
├── docker-compose.override.yml  # Development overrides
├── .dockerignore           # Docker ignore rules
├── backend/               # Flask backend
└── frontend/              # Next.js frontend
```

## 🚀 Available Commands

### Development Commands

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (resets database)
docker-compose down -v

# View running containers
docker-compose ps

# Execute command in container
docker-compose exec backend bash
docker-compose exec frontend bash
```

### Production Commands

```bash
# Build production image
docker build -f Dockerfile.prod -t kelasipro-prod .

# Run production container
docker run -p 8000:3000 kelasipro-prod

# Or use docker-compose with production override
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
FLASK_ENV=development
FLASK_DEBUG=1
DATABASE_URL=sqlite:///app.db
SECRET_KEY=your-secret-key
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Database Configuration

The application uses SQLite by default. For production, you can configure PostgreSQL:

```yaml
# In docker-compose.yml
db:
  image: postgres:13
  environment:
    POSTGRES_DB: kelasipro
    POSTGRES_USER: user
    POSTGRES_PASSWORD: password
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

## 🏗️ Architecture

### Multi-Stage Build

1. **Frontend Builder**: Builds Next.js application
2. **Backend Builder**: Installs Python dependencies
3. **Final Stage**: Combines both applications

### Services

- **frontend**: Next.js development server (port 3000)
- **backend**: Flask API server (port 5000)
- **db**: SQLite database with persistent storage

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :5000
   
   # Stop existing services
   docker-compose down
   ```

2. **Permission issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

3. **Database issues**
   ```bash
   # Reset database
   docker-compose down -v
   docker-compose up --build
   ```

4. **Frontend build issues**
   ```bash
   # Clear frontend cache
   docker-compose exec frontend rm -rf .next
   docker-compose restart frontend
   ```

### Health Checks

The production container includes health checks:
```bash
# Check container health
docker ps
# Look for "healthy" status
```

## 📦 Production Deployment

### Build Production Image

```bash
docker build -f Dockerfile.prod -t kelasipro:latest .
```

### Deploy to Production

```bash
# Run production container
docker run -d \
  --name kelasipro \
  -p 80:3000 \
  -v kelasipro_uploads:/app/uploads \
  -v kelasipro_db:/app \
  kelasipro:latest
```

### Docker Swarm/Kubernetes

For production deployment, consider:

1. **Docker Swarm**
2. **Kubernetes**
3. **AWS ECS**
4. **Google Cloud Run**

## 🔒 Security

### Best Practices

1. **Use environment variables** for secrets
2. **Enable HTTPS** in production
3. **Use non-root user** (included in production build)
4. **Regular updates** of base images
5. **Scan images** for vulnerabilities

### Production Security

```bash
# Scan for vulnerabilities
docker scan kelasipro:latest

# Use trusted base images
FROM node:18-alpine
FROM python:3.10-slim
```

## 📊 Monitoring

### Logs
```bash
# View application logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Metrics
```bash
# View container stats
docker stats

# View resource usage
docker system df
```

## 🔄 Updates

### Update Dependencies

```bash
# Update frontend dependencies
docker-compose exec frontend npm update

# Update backend dependencies
docker-compose exec backend pip install --upgrade -r requirements.txt
```

### Update Images

```bash
# Pull latest base images
docker-compose pull

# Rebuild with latest images
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test with Docker
5. Submit a pull request

## 📞 Support

For issues related to Docker setup:
- Check the troubleshooting section
- Review Docker logs
- Ensure Docker and Docker Compose are updated
- Verify port availability

## 📄 License

This project is licensed under the MIT License.