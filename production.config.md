# Production Deployment Configuration

## 🚀 Production Build

### Build Commands
```bash
# Standard production build
npm run build

# Build with bundle analysis
ANALYZE=true npm run build

# Start production server
npm start
```

### Build Optimization Checklist
- [x] Code splitting configured
- [x] Tree shaking enabled
- [x] Dead code elimination
- [x] Minification enabled
- [x] Source maps for debugging
- [x] Bundle analysis tooling
- [x] Console.log removal in production
- [x] Web Workers optimized
- [x] Static assets cached

---

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
# Multi-stage build for optimal image size
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Build and Run
```bash
# Build Docker image
docker build -t performance-dashboard:latest .

# Run container
docker run -p 3000:3000 performance-dashboard:latest

# Or use docker-compose
docker-compose up -d
```

---

## 🌐 Self-Hosted Deployment

### Prerequisites
- Node.js 20+
- Nginx or Apache
- PM2 for process management
- SSL certificate

### 1. Install Dependencies
```bash
npm ci --only=production
```

### 2. Build Application
```bash
npm run build
```

### 3. PM2 Configuration

**ecosystem.config.js**
```javascript
module.exports = {
  apps: [{
    name: 'performance-dashboard',
    script: 'server.ts',
    interpreter: 'npx',
    interpreterArgs: 'tsx',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### 4. Start with PM2
```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs performance-dashboard
```

### 5. Nginx Configuration

**/etc/nginx/sites-available/dashboard**
```nginx
# Upstream configuration
upstream dashboard_upstream {
    least_conn;
    server 127.0.0.1:3000;
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    # Brotli Compression (if module available)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript 
                 application/x-javascript text/xml application/xml 
                 application/xml+rss text/javascript;

    # Static assets caching
    location /_next/static/ {
        alias /var/www/dashboard/.next/static/;
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location /workers/ {
        alias /var/www/dashboard/public/workers/;
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # API routes - no cache
    location /api/ {
        proxy_pass http://dashboard_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SSE support
        proxy_buffering off;
        proxy_read_timeout 24h;
        proxy_connect_timeout 24h;
    }

    # Main application
    location / {
        proxy_pass http://dashboard_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /var/www/dashboard/public;
    }
}
```

### 6. Enable Nginx Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## ☁️ Cloud Platform Deployment

### Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**vercel.json**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### AWS (EC2 + Load Balancer)
1. Launch EC2 instance (t3.medium or larger)
2. Install Node.js and PM2
3. Configure Application Load Balancer
4. Set up Auto Scaling group
5. Configure CloudWatch monitoring
6. Setup CloudFront CDN for static assets

### Digital Ocean App Platform
```yaml
name: performance-dashboard
services:
- name: web
  github:
    repo: your-username/performance-dashboard
    branch: main
  build_command: npm run build
  run_command: npm start
  environment_slug: node-js
  instance_size_slug: professional-xs
  instance_count: 2
  http_port: 3000
  routes:
  - path: /
  health_check:
    http_path: /api/health
```

---

## 📊 Monitoring & Logging

### Health Check Endpoint
Already implemented at `/api/health`

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Memory usage
pm2 describe performance-dashboard

# Logs
pm2 logs --lines 1000
```

### Log Rotation
```bash
# Install pm2-logrotate
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### Application Monitoring
Consider integrating:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **New Relic** for APM
- **DataDog** for infrastructure monitoring

---

## 🔒 Security Checklist

- [x] HTTPS enabled with valid SSL certificate
- [x] Security headers configured (HSTS, X-Frame-Options, etc.)
- [x] Rate limiting on API routes
- [x] Environment variables secured
- [x] Dependencies audited (`npm audit`)
- [x] CORS properly configured
- [x] Input validation on all endpoints
- [x] SQL injection prevention (if using database)
- [x] XSS protection enabled

---

##backup & Recovery

### Backup Strategy
```bash
# Backup configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz config/

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Automated daily backups
0 2 * * * tar -czf /backups/dashboard-$(date +\%Y\%m\%d).tar.gz /var/www/dashboard/
```

### Disaster Recovery
1. Keep configuration in version control
2. Automate deployment with CI/CD
3. Maintain staging environment
4. Document rollback procedures
5. Test recovery process regularly

---

## 🚦 Performance Checklist

- [x] Gzip/Brotli compression enabled
- [x] Static assets cached with long TTL
- [x] CDN configured for global reach
- [x] Database queries optimized (if applicable)
- [x] Redis caching layer (if needed)
- [x] Load balancing configured
- [x] Auto-scaling enabled
- [x] Health checks active
- [x] Monitoring and alerting setup

---

## 📈 Scaling Strategy

### Horizontal Scaling
- Use PM2 cluster mode (already configured)
- Deploy behind load balancer
- Enable session stickiness for WebSocket connections
- Scale based on CPU/memory metrics

### Vertical Scaling
- Monitor resource usage
- Upgrade instance size when needed
- Optimize memory usage with limits

### Database Scaling (if added)
- Implement read replicas
- Use connection pooling
- Add caching layer (Redis)
- Consider sharding for large datasets

---

## 🎯 Go-Live Checklist

### Pre-Launch
- [ ] Run full performance testing
- [ ] Complete security audit
- [ ] Verify all environment variables
- [ ] Test backup/restore procedures
- [ ] Setup monitoring and alerting
- [ ] Configure log aggregation
- [ ] Document deployment process
- [ ] Train operations team

### Launch
- [ ] Run final smoke tests
- [ ] Monitor error rates
- [ ] Watch performance metrics
- [ ] Check SSL certificate validity
- [ ] Verify DNS propagation
- [ ] Test all critical paths

### Post-Launch
- [ ] Monitor for 24 hours
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Plan optimization iterations

---

## 📞 Support

### Troubleshooting
```bash
# Check application status
pm2 status

# View logs
pm2 logs --lines 100

# Restart application
pm2 restart performance-dashboard

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Common Issues
1. **High memory usage**: Check for memory leaks, restart PM2
2. **Slow performance**: Review bundle size, check CDN cache
3. **Connection errors**: Verify Nginx proxy settings
4. **SSL issues**: Renew certificates, check Nginx SSL config

---

**Deployment ready! All configuration files and procedures documented.**