# 🚀 Deploying EduPulse LMS to a VPS (Vercel Migration Guide)

This guide walks you step-by-step through deploying **EduPulse LMS** from Vercel to any Linux VPS (Ubuntu 22.04 / 24.04, Debian, DigitalOcean, Hetzner, AWS EC2, Linode, etc.) with **native WebSockets** and **local persistent disk storage**.

---

## 📋 What Changed from Vercel to VPS

| Feature | On Vercel | On Your VPS |
| :--- | :--- | :--- |
| **Real-time Engine** | SSE polling PostgreSQL every 3s (limited by 25s timeouts) | **Native WebSockets (`/ws`)** with sub-millisecond push & heartbeat |
| **File Storage** | `@vercel/blob` cloud tokens | **Fast local disk storage** in `./storage/uploads` with range streaming |
| **Process Model** | Ephemeral serverless lambdas | **Persistent Node.js process** (`server.js`) |
| **Upload Limits** | 4.5MB Vercel serverless payload cap | **Up to 100MB+** configured via Nginx `client_max_body_size` |
| **Health Checks** | Platform proprietary | **`/api/health`** endpoint with DB latency and active WebSocket metrics |

---

## 🛠️ Deploy with Node.js & PM2

### 1. Install Node.js 20 & PostgreSQL
```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib git curl

# Install PM2 process manager
sudo npm install -g pm2
```

### 2. Setup PostgreSQL
```bash
sudo -u postgres psql
```
Inside `psql`:
```sql
CREATE USER edupulse WITH PASSWORD 'YourSecureDbPassword';
CREATE DATABASE edu_lms OWNER edupulse;
GRANT ALL PRIVILEGES ON DATABASE edu_lms TO edupulse;
\q
```

### 3. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/edu-lms.git /var/www/edu-lms
cd /var/www/edu-lms
npm ci
```

### 4. Configure Production Environment Variables
Copy the template and edit your `.env`:
```bash
cp .env.example .env
nano .env
```

Make sure to set:
```env
DATABASE_URL="postgresql://edupulse:YourSecureDbPassword@localhost:5432/edu_lms?schema=public"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
SESSION_SECRET="your-random-32-char-secret-key"
DEFAULT_ADMIN_EMAIL="admin@yourdomain.com"
DEFAULT_ADMIN_PASSWORD="YourStrongPassword123!"
DEFAULT_ADMIN_NAME="System Admin"
```

### 5. Build and Migrate Database
```bash
npx prisma generate
npx prisma db push
npm run db:seed
npm run build
```

### 6. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Verify Health & WebSockets
```bash
curl http://localhost:3000/api/health
```
You should see:
```json
{
  "status": "healthy",
  "database": { "status": "ok", "latencyMs": 2 },
  "websocket": { "activeConnections": 0, "serverRunning": true }
}
```

---

## 🔒 Nginx Reverse Proxy & Free SSL Setup

To serve on `https://yourdomain.com` and route WebSocket upgrades properly:

### 1. Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Copy the Preconfigured Nginx Config
```bash
sudo cp /var/www/edu-lms/deploy/nginx.conf /etc/nginx/sites-available/edupulse.conf
sudo nano /etc/nginx/sites-available/edupulse.conf
```
*Replace `yourdomain.com` with your actual domain name.*

### 3. Obtain Free SSL Certificate
```bash
# Ensure Nginx is running
sudo ln -s /etc/nginx/sites-available/edupulse.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 4. Test and Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📡 Testing Native WebSocket Functionality

1. Open your browser to `https://yourdomain.com`.
2. Open DevTools (`F12`) -> **Network** tab -> filter by **WS** (WebSockets).
3. You will see a persistent connection to:
   ```
   wss://yourdomain.com/ws
   ```
4. Status code: **101 Switching Protocols**.
5. Frames tab will show real-time incoming and outgoing packets:
   - Client sends: `{"type": "PING"}`
   - Server responds: `{"type": "PONG", "timestamp": ...}`
   - Action triggers (e.g. chat messages, course updates) instantly appear with payload `{ type: "CHAT_MESSAGE", ... }` without any page reload or polling!

---

## 💾 Uploads & Backup Management

- **Storage Location**: `./storage/uploads/public` and `./storage/uploads/private`.
- **Backing up Database & Uploads**:
  ```bash
  # Backup Database
  pg_dump -U edupulse edu_lms > backup_$(date +%F).sql

  # Backup Uploaded Files
  tar -czf uploads_$(date +%F).tar.gz ./storage/uploads
  ```
