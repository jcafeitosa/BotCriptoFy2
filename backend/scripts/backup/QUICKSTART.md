# 🚀 Quick Start Guide

Get your backup system running in 5 minutes!

## 1. Install Dependencies

```bash
cd backend/scripts/backup
bun install
```

## 2. Configure Environment

```bash
# Copy environment template
cp .env.example ../../.env

# Edit with your database credentials
nano ../../.env
```

**Minimum required settings:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=beecripto
DB_USER=postgres
DB_PASSWORD=your_password
BACKUP_PATH=/var/backups/beecripto
```

## 3. Create Backup Directory

```bash
sudo mkdir -p /var/backups/beecripto
sudo chown -R $USER:$USER /var/backups/beecripto
sudo chmod 700 /var/backups/beecripto
```

## 4. Test Backup

```bash
# Run your first backup
bun run backup.ts daily
```

Expected output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Starting Database Backup Process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date: 2025-01-19T14:30:00.000Z
📦 Type: daily
🗄️  Database: beecripto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Created backup directory: /var/backups/beecripto
🔄 Starting database backup...
✅ Database backup completed
📊 Initial backup size: 1.25 GB
🔄 Calculating checksums...
✅ MD5: abc123...
✅ SHA256: def456...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ BACKUP COMPLETED SUCCESSFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 File: beecripto_daily_2025-01-19_14-30-00.dump
📊 Size: 1.25 GB
⏱️  Duration: 45.32s
🔐 MD5: abc123...
🔐 SHA256: def456...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 5. Verify Backup

```bash
bun run verify.ts health-check
```

## 6. Test Restore (Dry Run)

```bash
# List available backups
bun run restore.ts

# Test restore without making changes
bun run restore.ts beecripto_daily_2025-01-19_14-30-00.dump --dry-run
```

## 7. Setup Automation (Optional)

### Option A: Built-in Scheduler

```bash
# Start the scheduler in background
nohup bun run scheduler.ts > scheduler.log 2>&1 &
```

### Option B: System Service

```bash
# Copy service file
sudo cp beecripto-backup.service /etc/systemd/system/

# Edit paths in service file
sudo nano /etc/systemd/system/beecripto-backup.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable beecripto-backup
sudo systemctl start beecripto-backup
sudo systemctl status beecripto-backup
```

## 8. Enable Notifications (Optional)

### Email Setup (Gmail Example)

```bash
# Add to .env
EMAIL_NOTIFICATIONS=true
BACKUP_EMAIL_TO=admin@beecripto.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password  # Generate at https://myaccount.google.com/apppasswords
```

### Slack Setup

```bash
# 1. Create Slack incoming webhook at https://api.slack.com/messaging/webhooks
# 2. Add to .env
SLACK_NOTIFICATIONS=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 9. Common Commands

```bash
# Manual backups
bun run backup:daily      # Daily backup
bun run backup:weekly     # Weekly backup
bun run backup:monthly    # Monthly backup

# Restore
bun run restore           # Interactive mode
bun run restore backup.dump  # Restore specific file

# Maintenance
bun run rotate            # Clean old backups
bun run verify            # Health check

# Automation
bun run scheduler         # Start scheduler
```

## 10. Emergency Restore

If disaster strikes:

```bash
# 1. Stop application
sudo systemctl stop beecripto-backend

# 2. Restore database
cd backend/scripts/backup
bun run restore.ts latest_backup.dump --drop-existing --create-db

# 3. Verify restoration
psql -U postgres -d beecripto -c "SELECT COUNT(*) FROM users;"

# 4. Restart application
sudo systemctl start beecripto-backend
```

## 📊 Monitoring

Check backup status:

```bash
# View recent backups
ls -lh /var/backups/beecripto/

# Check service status
sudo systemctl status beecripto-backup

# View logs
sudo journalctl -u beecripto-backup -f
```

## 🆘 Troubleshooting

### Problem: Permission denied

```bash
sudo chown -R postgres:postgres /var/backups/beecripto
sudo chmod 700 /var/backups/beecripto
```

### Problem: pg_dump not found

```bash
# Add PostgreSQL bin to PATH
export PATH="/usr/lib/postgresql/14/bin:$PATH"
```

### Problem: Out of disk space

```bash
# Check space
df -h /var/backups/beecripto

# Clean old backups
bun run rotate
```

## 📚 Next Steps

- [Complete Documentation](README.md)
- [Configuration Guide](backup.config.ts)
- [Disaster Recovery Procedures](README.md#disaster-recovery)

## ✅ Checklist

- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Backup directory created
- [ ] First backup completed
- [ ] Backup verified
- [ ] Restore tested (dry run)
- [ ] Automation configured
- [ ] Notifications setup
- [ ] Team trained on DR procedures
- [ ] Documentation reviewed

---

**Need Help?** Check the [README](README.md) or contact DevOps team.
