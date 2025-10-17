# 🔐 Database Backup & Disaster Recovery System

Enterprise-grade automated backup and disaster recovery system for BeeCripto PostgreSQL database.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Scheduling](#scheduling)
- [Disaster Recovery](#disaster-recovery)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

## ✨ Features

### Backup Features
- ✅ **Multiple Backup Types**: Daily, weekly, and monthly backups
- ✅ **Compression**: Built-in gzip compression (configurable levels 1-9)
- ✅ **Encryption**: AES-256-CBC encryption for sensitive data
- ✅ **Checksum Verification**: MD5 and SHA256 checksums for integrity
- ✅ **Cloud Storage**: S3-compatible storage support
- ✅ **Parallel Backups**: Multi-threaded backup for faster execution
- ✅ **Notifications**: Email, Slack, and Discord notifications

### Disaster Recovery Features
- ✅ **Interactive Restore**: User-friendly restore process
- ✅ **Point-in-Time Recovery**: Restore from any backup
- ✅ **Dry Run Mode**: Test restore without making changes
- ✅ **Automatic Decryption**: Seamless encrypted backup restoration
- ✅ **Database Recreation**: Option to drop and recreate database

### Management Features
- ✅ **Automated Rotation**: Retention policy enforcement
- ✅ **Health Monitoring**: Continuous backup system health checks
- ✅ **Verification**: Integrity checks for all backups
- ✅ **Scheduled Jobs**: Cron-based automation
- ✅ **Local & Cloud Sync**: Dual storage for redundancy

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Backup Scheduler                         │
│  (Cron jobs for automated backups, rotation, health checks) │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌───▼─────┐
    │ Backup  │ │ Rotate  │ │ Verify  │
    │ Manager │ │ Manager │ │ Manager │
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │            │
         └───────────┼────────────┘
                     │
    ┌────────────────▼─────────────────┐
    │      Storage Layer                │
    │  ┌─────────┐      ┌────────────┐ │
    │  │  Local  │ ──── │  S3/Cloud  │ │
    │  │ Storage │      │  Storage   │ │
    │  └─────────┘      └────────────┘ │
    └───────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌───▼──────┐
    │  Email  │ │  Slack  │ │ Discord  │
    │ Notify  │ │ Notify  │ │  Notify  │
    └─────────┘ └─────────┘ └──────────┘
```

## 📦 Installation

### Prerequisites

- Bun v1.3 or higher
- PostgreSQL 14+ with `pg_dump` and `pg_restore` utilities
- Node.js 18+ (for some dependencies)

### Dependencies

```bash
cd backend/scripts/backup
bun install
```

Required packages:
- `@aws-sdk/client-s3` - S3 storage
- `nodemailer` - Email notifications
- `cron` - Job scheduling

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in `backend/` or set environment variables:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=beecripto
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Backup Storage
BACKUP_PATH=/var/backups/beecripto

# Backup Options
BACKUP_ENCRYPTION=true
BACKUP_ENCRYPTION_KEY=your_32_character_encryption_key

# S3 Configuration (Optional)
S3_BACKUP_ENABLED=true
S3_BACKUP_BUCKET=beecripto-backups
S3_BACKUP_REGION=us-east-1
S3_BACKUP_PREFIX=database/
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Email Notifications (Optional)
EMAIL_NOTIFICATIONS=true
BACKUP_EMAIL_TO=admin@beecripto.com,backup@beecripto.com
BACKUP_EMAIL_FROM=backups@beecripto.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Slack Notifications (Optional)
SLACK_NOTIFICATIONS=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Discord Notifications (Optional)
DISCORD_NOTIFICATIONS=true
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
```

### Retention Policy

Default retention (configurable in `backup.config.ts`):
- **Daily backups**: 7 days
- **Weekly backups**: 4 weeks
- **Monthly backups**: 12 months

## 🚀 Usage

### Manual Backup

```bash
# Daily backup
bun run backup.ts daily

# Weekly backup
bun run backup.ts weekly

# Monthly backup
bun run backup.ts monthly
```

### Restore Database

```bash
# Interactive mode (select from available backups)
bun run restore.ts

# Restore specific backup
bun run restore.ts backup_file.dump

# Restore with options
bun run restore.ts backup_file.dump --drop-existing --create-db

# Dry run (test without making changes)
bun run restore.ts backup_file.dump --dry-run

# Skip checksum verification
bun run restore.ts backup_file.dump --skip-verify
```

### Backup Rotation

```bash
# Clean up old backups based on retention policy
bun run rotate.ts
```

### Verification

```bash
# Health check (verify all backups)
bun run verify.ts health-check

# Verify specific backup
bun run verify.ts verify backup_file.dump

# Test restore capability
bun run verify.ts test-restore backup_file.dump
```

## ⏰ Scheduling

### Automatic Scheduler

Run the built-in scheduler for automated backups:

```bash
bun run scheduler.ts
```

Default schedule:
- **Daily backup**: 2:00 AM
- **Weekly backup**: Sunday 3:00 AM
- **Monthly backup**: 1st of month 4:00 AM
- **Rotation**: Daily 5:00 AM
- **Health check**: Every hour

### System Service (systemd)

Create `/etc/systemd/system/beecripto-backup.service`:

```ini
[Unit]
Description=BeeCripto Backup Scheduler
After=network.target postgresql.service

[Service]
Type=simple
User=postgres
WorkingDirectory=/path/to/backend/scripts/backup
ExecStart=/usr/local/bin/bun run scheduler.ts
Restart=always
RestartSec=10

Environment="NODE_ENV=production"
EnvironmentFile=/path/to/backend/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable beecripto-backup
sudo systemctl start beecripto-backup
sudo systemctl status beecripto-backup
```

### Cron Jobs (Alternative)

Add to crontab:

```cron
# Daily backup at 2 AM
0 2 * * * cd /path/to/backend/scripts/backup && bun run backup.ts daily

# Weekly backup on Sunday at 3 AM
0 3 * * 0 cd /path/to/backend/scripts/backup && bun run backup.ts weekly

# Monthly backup on 1st at 4 AM
0 4 1 * * cd /path/to/backend/scripts/backup && bun run backup.ts monthly

# Daily rotation at 5 AM
0 5 * * * cd /path/to/backend/scripts/backup && bun run rotate.ts

# Hourly health check
0 * * * * cd /path/to/backend/scripts/backup && bun run verify.ts health-check
```

## 🆘 Disaster Recovery

### Recovery Scenarios

#### 1. Complete Database Loss

```bash
# Step 1: Verify backup integrity
bun run verify.ts test-restore latest_backup.dump

# Step 2: Restore database (creates new database)
bun run restore.ts latest_backup.dump --create-db

# Step 3: Verify restoration
psql -U postgres -d beecripto -c "SELECT COUNT(*) FROM users;"
```

#### 2. Data Corruption

```bash
# Step 1: Stop application
sudo systemctl stop beecripto-backend

# Step 2: Drop corrupted database and restore
bun run restore.ts latest_backup.dump --drop-existing --create-db

# Step 3: Restart application
sudo systemctl start beecripto-backend
```

#### 3. Point-in-Time Recovery

```bash
# List available backups
bun run restore.ts

# Select appropriate backup from list
# Restore database to that point in time
```

### Recovery Time Objectives (RTO)

| Database Size | Expected RTO |
|--------------|--------------|
| < 1 GB       | 5-10 minutes |
| 1-10 GB      | 10-30 minutes|
| 10-50 GB     | 30-90 minutes|
| > 50 GB      | 1-3 hours    |

### Recovery Point Objectives (RPO)

- **Daily backups**: Maximum 24 hours data loss
- **Weekly backups**: Maximum 7 days data loss
- **Monthly backups**: Maximum 30 days data loss

## 📊 Monitoring

### Health Check Output

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ HEALTH CHECK PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total backups: 19
✅ Verified: 19
❌ Failed: 0
💾 Total size: 2.34 GB
📅 Oldest backup: 2025-01-01T02:00:00Z
📅 Newest backup: 2025-01-19T02:00:00Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Notification Examples

#### Success Email
- Subject: ✅ Database Backup Completed
- Details: File name, size, duration, checksums
- Status: Visual indicators with color coding

#### Failure Slack
- Alert: ❌ Database Backup Failed
- Details: Error message, database name
- Actions: Links to logs and troubleshooting

### Grafana Integration

Metrics exposed for Grafana dashboards:
- `backup_duration_seconds` - Backup execution time
- `backup_size_bytes` - Backup file sizes
- `backup_success_total` - Successful backups count
- `backup_failure_total` - Failed backups count
- `backup_age_hours` - Age of latest backup

## 🎯 Best Practices

### Security

1. **Encrypt Sensitive Backups**: Always enable encryption for production
2. **Secure Storage**: Use private S3 buckets with access controls
3. **Rotate Keys**: Change encryption keys periodically
4. **Limit Access**: Restrict backup directory permissions (chmod 700)
5. **Network Security**: Use VPN/private networks for backup transfers

### Reliability

1. **Test Restores**: Monthly restore drills to verify backup integrity
2. **Multiple Locations**: Store backups in 3 different locations (3-2-1 rule)
3. **Monitor Storage**: Ensure adequate disk space for backups
4. **Verify Checksums**: Always verify backup integrity
5. **Document Procedures**: Keep DR runbooks updated

### Performance

1. **Off-Peak Backups**: Schedule during low-traffic hours
2. **Parallel Jobs**: Use parallel backup for large databases
3. **Compression**: Balance compression level vs. speed
4. **Network Bandwidth**: Consider bandwidth for cloud uploads
5. **Retention Policy**: Don't keep unnecessary old backups

### Compliance

1. **Audit Trail**: Log all backup and restore operations
2. **Data Retention**: Comply with regulatory requirements
3. **Encryption Standards**: Use approved encryption algorithms
4. **Access Control**: Implement role-based access
5. **Documentation**: Maintain compliance documentation

## 🔧 Troubleshooting

### Common Issues

#### Backup Fails with "Permission Denied"

```bash
# Fix backup directory permissions
sudo chown -R postgres:postgres /var/backups/beecripto
sudo chmod 700 /var/backups/beecripto
```

#### S3 Upload Fails

```bash
# Verify AWS credentials
aws s3 ls s3://beecripto-backups/

# Check IAM permissions (need: s3:PutObject, s3:GetObject, s3:DeleteObject)
```

#### Restore Fails with "Database exists"

```bash
# Use --drop-existing flag
bun run restore.ts backup.dump --drop-existing --create-db
```

#### Out of Disk Space

```bash
# Check disk usage
df -h /var/backups/beecripto

# Run rotation to clean up old backups
bun run rotate.ts

# Adjust retention policy in backup.config.ts
```

### Logs

Backup logs are written to:
- Standard output (captured by systemd)
- Application logs: `backend/logs/backup.log`

View logs:
```bash
# Systemd service logs
sudo journalctl -u beecripto-backup -f

# Application logs
tail -f backend/logs/backup.log
```

## 📚 Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/backup-for-s3.html)
- [Disaster Recovery Planning](https://en.wikipedia.org/wiki/Disaster_recovery)

## 🤝 Support

For issues or questions:
1. Check troubleshooting section
2. Review logs for error details
3. Contact DevOps team
4. Open GitHub issue

## 📝 License

Copyright © 2025 BeeCripto. All rights reserved.
