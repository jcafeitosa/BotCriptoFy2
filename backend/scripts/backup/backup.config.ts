/**
 * Backup Configuration
 * Central configuration for database backup and disaster recovery
 */

export interface BackupConfig {
  // Database connection
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };

  // Backup storage
  storage: {
    local: {
      enabled: boolean;
      path: string;
      retention: {
        daily: number;    // Days to keep daily backups
        weekly: number;   // Weeks to keep weekly backups
        monthly: number;  // Months to keep monthly backups
      };
    };
    s3?: {
      enabled: boolean;
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      prefix: string;
    };
  };

  // Backup options
  options: {
    compression: boolean;
    compressionLevel: number; // 1-9
    encryption: boolean;
    encryptionKey?: string;
    parallel: boolean;
    parallelJobs: number;
    includeLargeObjects: boolean;
    format: 'custom' | 'plain' | 'directory' | 'tar';
  };

  // Notifications
  notifications: {
    email?: {
      enabled: boolean;
      to: string[];
      from: string;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
    };
    discord?: {
      enabled: boolean;
      webhookUrl: string;
    };
  };

  // Monitoring
  monitoring: {
    healthCheckInterval: number; // Minutes
    maxBackupAge: number; // Hours
    minBackupSize: number; // Bytes
    alertOnFailure: boolean;
  };
}

// Default configuration
export const defaultBackupConfig: BackupConfig = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'beecripto',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  storage: {
    local: {
      enabled: true,
      path: process.env.BACKUP_PATH || '/var/backups/beecripto',
      retention: {
        daily: 7,    // Keep 7 daily backups
        weekly: 4,   // Keep 4 weekly backups
        monthly: 12, // Keep 12 monthly backups
      },
    },
    s3: {
      enabled: process.env.S3_BACKUP_ENABLED === 'true',
      bucket: process.env.S3_BACKUP_BUCKET || 'beecripto-backups',
      region: process.env.S3_BACKUP_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      prefix: process.env.S3_BACKUP_PREFIX || 'database/',
    },
  },

  options: {
    compression: true,
    compressionLevel: 6,
    encryption: process.env.BACKUP_ENCRYPTION === 'true',
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
    parallel: true,
    parallelJobs: 4,
    includeLargeObjects: true,
    format: 'custom',
  },

  notifications: {
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
      to: (process.env.BACKUP_EMAIL_TO || '').split(',').filter(Boolean),
      from: process.env.BACKUP_EMAIL_FROM || 'backups@beecripto.com',
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
    },
    slack: {
      enabled: process.env.SLACK_NOTIFICATIONS === 'true',
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    },
    discord: {
      enabled: process.env.DISCORD_NOTIFICATIONS === 'true',
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    },
  },

  monitoring: {
    healthCheckInterval: 60, // Check every hour
    maxBackupAge: 26,        // Alert if backup older than 26 hours
    minBackupSize: 1024 * 1024, // 1MB minimum
    alertOnFailure: true,
  },
};

// Load and validate configuration
export function loadBackupConfig(): BackupConfig {
  const config = { ...defaultBackupConfig };

  // Validate required fields
  if (!config.database.password) {
    throw new Error('Database password is required (DB_PASSWORD)');
  }

  if (config.options.encryption && !config.options.encryptionKey) {
    throw new Error('Encryption key is required when encryption is enabled (BACKUP_ENCRYPTION_KEY)');
  }

  if (config.storage.s3?.enabled) {
    if (!config.storage.s3.accessKeyId || !config.storage.s3.secretAccessKey) {
      throw new Error('S3 credentials required when S3 backup is enabled');
    }
  }

  return config;
}
