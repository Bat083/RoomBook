# Deployment Guide

This guide covers deploying the Room Booking System to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Database Migration](#database-migration)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Services

- **PostgreSQL 15+**: Primary database
- **SMTP Server**: Email notifications (e.g., SendGrid, AWS SES, Mailgun)
- **SSL Certificate**: For HTTPS (Let's Encrypt recommended)
- **Domain**: For production access

### Optional Services

- **UptimeRobot**: Power outage detection (EC-002 feature)
- **Redis**: Session store (alternative to PostgreSQL)
- **CDN**: Static asset delivery (CloudFlare, AWS CloudFront)

### Server Requirements

**Minimum**:
- 2 CPU cores
- 4GB RAM
- 20GB SSD storage
- Ubuntu 22.04 LTS or similar

**Recommended**:
- 4 CPU cores
- 8GB RAM
- 50GB SSD storage
- Ubuntu 22.04 LTS

## Environment Setup

### 1. Prepare Environment Variables

Create `.env.production` files:

**Backend** (`backend/.env.production`):

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://roombook:STRONG_PASSWORD@db.internal:5432/roombook_prod
SESSION_SECRET=GENERATE_STRONG_SECRET_HERE
SESSION_MAX_AGE=86400000

# Email Configuration
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.YOUR_SENDGRID_API_KEY
EMAIL_FROM=Room Booking System <noreply@yourdomain.com>

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Power Outage Detection
UPTIME_ROBOT_API_KEY=your_uptimerobot_api_key
UPTIME_ROBOT_MONITOR_ID=your_monitor_id
```

**Frontend** (`frontend/.env.production`):

```env
VITE_API_URL=https://api.yourdomain.com
```

### 2. Generate Secrets

```bash
# Session secret (64+ random characters)
openssl rand -base64 48

# Database password
openssl rand -base64 32
```

## Docker Deployment

### 1. Build and Deploy

```bash
# Clone repository
git clone <repository-url>
cd RoomBook

# Copy and configure environment
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production
# Edit both files with production values

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. SSL Configuration (Nginx Proxy)

Create `nginx/ssl/` directory and add your SSL certificates:

```bash
mkdir -p nginx/ssl
cp /path/to/your/fullchain.pem nginx/ssl/
cp /path/to/your/privkey.pem nginx/ssl/
```

Update `nginx/nginx.conf` for HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Manual Deployment

### 1. Backend Deployment

```bash
# Install dependencies
cd backend
npm ci --only=production

# Build TypeScript
npm run build

# Run database migrations
npx prisma migrate deploy

# Seed database (first time only)
npx prisma db seed

# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

**PM2 Configuration** (`backend/ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'roombook-api',
    script: 'dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

### 2. Frontend Deployment

```bash
# Build frontend
cd frontend
npm ci
npm run build

# Deploy to web server (Nginx example)
sudo mkdir -p /var/www/roombook
sudo cp -r dist/* /var/www/roombook/
```

**Nginx Configuration** (`/etc/nginx/sites-available/roombook`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/roombook;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/roombook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Database Migration

### Production Migration Process

```bash
# Backup database first
pg_dump -h localhost -U roombook roombook_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
cd backend
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

### Rollback Strategy

```bash
# Restore from backup if needed
psql -h localhost -U roombook roombook_prod < backup_20260523_120000.sql
```

## Monitoring & Health Checks

### Health Check Endpoints

- Backend: `https://api.yourdomain.com/health`
- Frontend: `https://yourdomain.com/health`

### Expected Responses

**Backend Health Check**:

```json
{
  "status": "ok",
  "timestamp": "2026-05-23T10:00:00.000Z",
  "uptime": 3600,
  "startTime": "2026-05-23T09:00:00.000Z",
  "database": {
    "connected": true,
    "lastWrite": "2026-05-23T09:59:00.000Z"
  }
}
```

### UptimeRobot Configuration

1. Create monitor at https://uptimerobot.com
2. Monitor Type: HTTP(s)
3. URL: `https://api.yourdomain.com/health`
4. Monitoring Interval: 5 minutes
5. Get API key and Monitor ID
6. Add to backend environment variables

### Log Monitoring

**Docker**:

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View backend logs only
docker-compose -f docker-compose.prod.yml logs -f backend

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

**PM2**:

```bash
# View logs
pm2 logs roombook-api

# Monitor
pm2 monit

# Flush logs
pm2 flush
```

## Performance Optimization

### Database Connection Pooling

Update `backend/src/config/database.ts`:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  connectionLimit: 20, // For 50+ concurrent users
});
```

### Database Indexes

Verify indexes are created (automatically via Prisma schema):

```sql
-- Check indexes
\di

-- Expected indexes:
-- bookings_room_id_idx
-- bookings_organizer_id_idx
-- bookings_room_id_start_time_end_time_idx
-- notifications_user_id_idx
```

### Caching Strategy (Optional)

Install Redis for session storage:

```bash
npm install connect-redis redis
```

Update session configuration in `backend/src/config/session.ts`.

## Troubleshooting

### Common Issues

**1. Database Connection Failed**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U roombook -d roombook_prod

# Check environment variable
echo $DATABASE_URL
```

**2. Email Not Sending**

```bash
# Test SMTP connection
npm install -g mailtest
mailtest --host smtp.example.com --port 587 --user apikey --pass your_password
```

**3. CSRF Token Errors**

Ensure:
- CORS_ORIGIN matches frontend domain exactly
- Session cookie is being set (check browser DevTools)
- CSRF token is included in POST/PUT/DELETE requests

**4. High Memory Usage**

```bash
# Monitor memory
pm2 monit

# Restart if needed
pm2 restart roombook-api
```

**5. Slow Queries**

```bash
# Enable slow query logging in PostgreSQL
ALTER DATABASE roombook_prod SET log_min_duration_statement = 1000;

# Check logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

## Security Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Strong secrets generated (session, database password)
- [ ] Firewall configured (only ports 80, 443, SSH open)
- [ ] Database access restricted to internal network
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled
- [ ] Security headers configured (Helmet.js)
- [ ] Environment variables secured (not in git)
- [ ] Regular backups scheduled
- [ ] Monitoring and alerting configured

## Backup Strategy

### Automated Daily Backups

Create cron job:

```bash
crontab -e
```

Add:

```cron
# Daily backup at 2 AM
0 2 * * * /usr/bin/pg_dump -h localhost -U roombook roombook_prod | gzip > /backups/roombook_$(date +\%Y\%m\%d).sql.gz

# Delete backups older than 30 days
0 3 * * * find /backups -name "roombook_*.sql.gz" -mtime +30 -delete
```

## Scaling Considerations

### Horizontal Scaling

- Use PM2 cluster mode (already configured)
- Add load balancer (Nginx, HAProxy, AWS ALB)
- Scale database with read replicas

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize PostgreSQL configuration
- Enable query caching

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrated and seeded
- [ ] SSL certificates installed
- [ ] Nginx/reverse proxy configured
- [ ] Health checks passing
- [ ] Email notifications working
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] Logs being collected
- [ ] Documentation updated
- [ ] Team trained on deployment process

## Additional Resources

- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [PostgreSQL Tuning](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
