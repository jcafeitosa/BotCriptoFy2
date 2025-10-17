/**
 * Notification Module
 * Sends backup status notifications via Email, Slack, and Discord
 */

import nodemailer from 'nodemailer';
import type { BackupConfig } from './backup.config';
import type { BackupResult } from './backup';

interface NotificationPayload {
  title: string;
  message: string;
  status: 'success' | 'failure' | 'warning';
  details?: Record<string, any>;
}

/**
 * Send email notification
 */
async function sendEmailNotification(config: BackupConfig, payload: NotificationPayload): Promise<void> {
  const emailConfig = config.notifications.email;

  if (!emailConfig?.enabled || !emailConfig.to.length) {
    return;
  }

  try {
    const transporter = nodemailer.createTransporter({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user: emailConfig.smtp.auth.user,
        pass: emailConfig.smtp.auth.pass,
      },
    });

    const statusEmoji = payload.status === 'success' ? '✅' : payload.status === 'failure' ? '❌' : '⚠️';
    const statusColor = payload.status === 'success' ? '#00C851' : payload.status === 'failure' ? '#ff4444' : '#ffbb33';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: ${statusColor};
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 0 0 8px 8px;
            }
            .message {
              background: white;
              padding: 15px;
              border-radius: 4px;
              margin-bottom: 15px;
              border-left: 4px solid ${statusColor};
            }
            .details {
              background: white;
              padding: 15px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
            }
            .details table {
              width: 100%;
              border-collapse: collapse;
            }
            .details td {
              padding: 8px;
              border-bottom: 1px solid #dee2e6;
            }
            .details td:first-child {
              font-weight: bold;
              width: 40%;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #6c757d;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${statusEmoji} ${payload.title}</h1>
          </div>
          <div class="content">
            <div class="message">
              <p>${payload.message}</p>
            </div>
            ${
              payload.details
                ? `
              <div class="details">
                <table>
                  ${Object.entries(payload.details)
                    .map(
                      ([key, value]) => `
                    <tr>
                      <td>${key}</td>
                      <td>${value}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </table>
              </div>
            `
                : ''
            }
          </div>
          <div class="footer">
            <p>BeeCripto Automated Backup System</p>
            <p>Generated at ${new Date().toISOString()}</p>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: emailConfig.from,
      to: emailConfig.to.join(', '),
      subject: `${statusEmoji} ${payload.title}`,
      html,
    });

    console.log(`✅ Email notification sent to ${emailConfig.to.length} recipient(s)`);
  } catch (error: any) {
    console.error(`⚠️  Failed to send email notification: ${error.message}`);
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(config: BackupConfig, payload: NotificationPayload): Promise<void> {
  const slackConfig = config.notifications.slack;

  if (!slackConfig?.enabled || !slackConfig.webhookUrl) {
    return;
  }

  try {
    const statusEmoji = payload.status === 'success' ? ':white_check_mark:' : payload.status === 'failure' ? ':x:' : ':warning:';
    const statusColor = payload.status === 'success' ? 'good' : payload.status === 'failure' ? 'danger' : 'warning';

    const slackPayload = {
      attachments: [
        {
          color: statusColor,
          title: `${statusEmoji} ${payload.title}`,
          text: payload.message,
          fields: payload.details
            ? Object.entries(payload.details).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              }))
            : [],
          footer: 'BeeCripto Backup System',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(slackConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      throw new Error(`Slack API returned ${response.status}`);
    }

    console.log('✅ Slack notification sent');
  } catch (error: any) {
    console.error(`⚠️  Failed to send Slack notification: ${error.message}`);
  }
}

/**
 * Send Discord notification
 */
async function sendDiscordNotification(config: BackupConfig, payload: NotificationPayload): Promise<void> {
  const discordConfig = config.notifications.discord;

  if (!discordConfig?.enabled || !discordConfig.webhookUrl) {
    return;
  }

  try {
    const statusEmoji = payload.status === 'success' ? '✅' : payload.status === 'failure' ? '❌' : '⚠️';
    const statusColor = payload.status === 'success' ? 0x00c851 : payload.status === 'failure' ? 0xff4444 : 0xffbb33;

    const embed: any = {
      title: `${statusEmoji} ${payload.title}`,
      description: payload.message,
      color: statusColor,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'BeeCripto Backup System',
      },
    };

    if (payload.details) {
      embed.fields = Object.entries(payload.details).map(([key, value]) => ({
        name: key,
        value: String(value),
        inline: true,
      }));
    }

    const discordPayload = {
      embeds: [embed],
    };

    const response = await fetch(discordConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      throw new Error(`Discord API returned ${response.status}`);
    }

    console.log('✅ Discord notification sent');
  } catch (error: any) {
    console.error(`⚠️  Failed to send Discord notification: ${error.message}`);
  }
}

/**
 * Send backup status notification to all configured channels
 */
export async function notifyBackupStatus(config: BackupConfig, result: BackupResult): Promise<void> {
  const payload: NotificationPayload = {
    title: result.success ? 'Database Backup Completed' : 'Database Backup Failed',
    message: result.success
      ? `Database backup completed successfully in ${(result.duration! / 1000).toFixed(2)} seconds.`
      : `Database backup failed: ${result.error}`,
    status: result.success ? 'success' : 'failure',
    details: result.success
      ? {
          Database: config.database.name,
          'File Name': result.fileName!,
          'File Size': formatBytes(result.size!),
          Duration: `${(result.duration! / 1000).toFixed(2)}s`,
          'MD5 Checksum': result.checksums!.md5.substring(0, 16) + '...',
          'SHA256 Checksum': result.checksums!.sha256.substring(0, 16) + '...',
        }
      : {
          Database: config.database.name,
          Error: result.error!,
          Duration: `${(result.duration! / 1000).toFixed(2)}s`,
        },
  };

  // Send notifications in parallel
  await Promise.all([
    sendEmailNotification(config, payload),
    sendSlackNotification(config, payload),
    sendDiscordNotification(config, payload),
  ]);
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}
