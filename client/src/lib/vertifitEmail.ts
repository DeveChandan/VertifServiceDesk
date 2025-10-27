import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

class VertifitEmailService {
  private transporter: nodemailer.Transporter;
  private isInitialized: boolean = false;

  constructor() {
    // Check if SMTP_PASS is available
    if (!process.env.SMTP_PASS) {
      console.error('❌ SMTP_PASS is not set in environment variables');
      console.log('💡 Please set SMTP_PASS in your .env file');
      return;
    }

    this.initializeTransporter();
  }

  private initializeTransporter() {
    // cPanel specific configuration
    const smtpConfig = {
      host: 'mail.vertifitsolutions.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: 'Chandan.mondal@vertifitsolutions.com',
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // cPanel often uses self-signed certs
      },
      // cPanel specific timeouts
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    };

    console.log('🔧 Initializing Vertifit cPanel Email Service:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.auth.user,
      hasPassword: !!process.env.SMTP_PASS
    });

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.isInitialized = true;
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    if (!this.isInitialized) {
      console.error('❌ Email service not initialized - SMTP_PASS missing');
      return;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Vertifit cPanel SMTP Connection verified successfully');
    } catch (error: any) {
      console.error('❌ Vertifit cPanel SMTP Connection failed:', error.message);
      
      // Try alternative port
      if (error.message.includes('ECONNREFUSED') || error.message.includes('TIMEOUT')) {
        console.log('🔄 Trying alternative port 465 with SSL...');
        await this.tryAlternativeConfig();
      } else {
        throw error;
      }
    }
  }

  private async tryAlternativeConfig(): Promise<void> {
    const altTransporter = nodemailer.createTransport({
      host: 'mail.vertifitsolutions.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: 'Chandan.mondal@vertifitsolutions.com',
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await altTransporter.verify();
    this.transporter = altTransporter;
    console.log('✅ Vertifit cPanel SMTP Connection verified on port 465 (SSL)');
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('❌ Email service not initialized - cannot send email');
      return false;
    }

    try {
      const mailOptions = {
        from: '"Vertifit Service Desk" <Chandan.mondal@vertifitsolutions.com>',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
        headers: {
          'X-Mailer': 'Vertifit Service Desk',
          'X-CPanel-Domain': 'vertifitsolutions.com',
          'X-Application': 'Vertifit Service Desk System'
        }
      };

      console.log('📧 Sending email via Vertifit cPanel:', {
        to: options.to,
        subject: options.subject
      });

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Vertifit cPanel Email sent successfully:', result.messageId);
      return true;
      
    } catch (error: any) {
      console.error('❌ Vertifit cPanel Email failed:', {
        error: error.message,
        to: options.to,
        subject: options.subject
      });
      return false;
    }
  }

  // Test method
  async sendTestEmail(toEmail?: string): Promise<{success: boolean; error?: string}> {
    if (!this.isInitialized) {
      return { success: false, error: 'Email service not initialized - SMTP_PASS missing' };
    }

    try {
      const testTo = toEmail || 'Chandan.mondal@vertifitsolutions.com';
      
      const success = await this.sendEmail({
        to: testTo,
        subject: 'Vertifit Service Desk - SMTP Test',
        html: `
          <h2>✅ Vertifit SMTP Test Successful</h2>
          <p>Your Vertifit cPanel email configuration is working correctly!</p>
          <p><strong>Server:</strong> mail.vertifitsolutions.com</p>
          <p><strong>Port:</strong> ${process.env.SMTP_PORT || '587'}</p>
          <p><strong>From:</strong> Chandan.mondal@vertifitsolutions.com</p>
        `,
        text: 'Vertifit SMTP Test Successful - Your email configuration is working correctly!'
      });

      return { success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Check if service is ready
  isReady(): boolean {
    return this.isInitialized;
  }
}

export const vertifitEmailService = new VertifitEmailService();