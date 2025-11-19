const { Resend } = require('resend');

class NotificationService {
  /**
   * Send email notification for failed health check
   */
  static async sendFailureEmail(endpoint, checkResult, settings) {
    // Check if notifications are enabled
    if (!settings.resend_enabled || settings.resend_enabled !== 'true') {
      return { sent: false, reason: 'Notifications disabled' };
    }

    // Validate API key
    if (!settings.resend_api_key || settings.resend_api_key.trim() === '') {
      return { sent: false, reason: 'No API key configured' };
    }

    // Validate email address
    if (!settings.notification_email || settings.notification_email.trim() === '') {
      return { sent: false, reason: 'No email address configured' };
    }

    try {
      const resend = new Resend(settings.resend_api_key);

      // Prepare email content
      const subject = `Health Check Failed: ${endpoint.name}`;
      const htmlContent = this.generateEmailHTML(endpoint, checkResult);
      const textContent = this.generateEmailText(endpoint, checkResult);

      // Send email
      const data = await resend.emails.send({
        from: 'Health Check Dashboard <onboarding@resend.dev>',
        to: [settings.notification_email],
        subject: subject,
        html: htmlContent,
        text: textContent
      });

      return { sent: true, messageId: data.id };
    } catch (error) {
      console.error('Error sending notification email:', error);
      return { sent: false, reason: error.message };
    }
  }

  /**
   * Generate HTML email content
   */
  static generateEmailHTML(endpoint, checkResult) {
    const timestamp = new Date(checkResult.timestamp || Date.now()).toLocaleString();
    
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc3545; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .detail { margin: 10px 0; padding: 10px; background-color: white; border-left: 3px solid #dc3545; }
    .label { font-weight: bold; color: #555; }
    .error { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⚠️ Health Check Failed</h2>
    </div>
    <div class="content">
      <div class="detail">
        <span class="label">Endpoint:</span> ${endpoint.name}
      </div>
      <div class="detail">
        <span class="label">URL:</span> ${endpoint.url}
      </div>
      <div class="detail">
        <span class="label">Method:</span> ${endpoint.method}
      </div>
      <div class="detail">
        <span class="label">Time:</span> ${timestamp}
      </div>
      ${checkResult.status_code ? `
      <div class="detail">
        <span class="label">Status Code:</span> ${checkResult.status_code}
      </div>
      ` : ''}
      ${checkResult.response_time ? `
      <div class="detail">
        <span class="label">Response Time:</span> ${checkResult.response_time}ms
      </div>
      ` : ''}
      ${checkResult.error_message ? `
      <div class="detail">
        <span class="label">Error:</span><br>
        <span class="error">${checkResult.error_message}</span>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email content
   */
  static generateEmailText(endpoint, checkResult) {
    const timestamp = new Date(checkResult.timestamp || Date.now()).toLocaleString();
    
    let text = `Health Check Failed\n\n`;
    text += `Endpoint: ${endpoint.name}\n`;
    text += `URL: ${endpoint.url}\n`;
    text += `Method: ${endpoint.method}\n`;
    text += `Time: ${timestamp}\n`;
    
    if (checkResult.status_code) {
      text += `Status Code: ${checkResult.status_code}\n`;
    }
    
    if (checkResult.response_time) {
      text += `Response Time: ${checkResult.response_time}ms\n`;
    }
    
    if (checkResult.error_message) {
      text += `\nError: ${checkResult.error_message}\n`;
    }
    
    return text;
  }
}

module.exports = NotificationService;
