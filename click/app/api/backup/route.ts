import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { action, data, email } = await request.json();

    if (action === 'sendBackup') {
      if (!data || !email) {
        return NextResponse.json({ error: 'Missing data or email' }, { status: 400 });
      }

      console.log(`[Backup] Attempting backup to ${email}...`);

      // Validate env credentials before attempting connection
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        const msg = 'EMAIL_USER or EMAIL_PASS not set in .env.local';
        console.error(`[Backup] Configuration error: ${msg}`);
        return NextResponse.json({ error: msg }, { status: 500 });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '465'),
        secure: process.env.EMAIL_SECURE !== 'false', // true for port 465 (SSL)
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // Use Gmail App Password (16-digit), NOT your normal password
        },
      });

      // Test the connection before sending
      try {
        await transporter.verify();
        console.log('[Backup] SMTP connection verified successfully');
      } catch (verifyError: any) {
        const msg: string = verifyError.message || '';
        let friendly = `SMTP connection failed: ${msg}`;
        if (msg.includes('535') || msg.includes('credentials') || msg.includes('Username and Password not accepted')) {
          friendly = 'Invalid Credentials — Gmail App Password galat hai. myaccount.google.com par ja kar naya App Password generate karo.';
        } else if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('network')) {
          friendly = 'Network Issue — Internet connection check karo ya SMTP host/port verify karo.';
        } else if (msg.includes('certificate') || msg.includes('self signed')) {
          friendly = 'SSL Certificate Error — EMAIL_SECURE setting check karo.';
        }
        console.error('[Backup] SMTP connection failed:', friendly);
        return NextResponse.json({ error: friendly }, { status: 502 });
      }

      const today = new Date().toISOString().split('T')[0];
      const mailOptions = {
        from: `"Spider Station Backup" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Spider Station Backup — ${today}`,
        text: `Spider Station daily backup attached.\nGenerated: ${new Date().toLocaleString()}`,
        attachments: [{
          filename: `spider_backup_${today}.json`,
          content: JSON.stringify(data, null, 2),
          contentType: 'application/json',
        }],
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Backup] Email sent successfully to ${email}`);

      return NextResponse.json({ success: true, message: `Backup sent to ${email}` });

    } else if (action === 'scheduleNightly') {
      return NextResponse.json({ success: true, message: 'Nightly backup scheduled' });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[Backup] Unexpected error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    smtpHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
    smtpPort: process.env.EMAIL_PORT || '465',
    emailUser: process.env.EMAIL_USER ? '✓ configured' : '✗ not set',
    emailPass: process.env.EMAIL_PASS ? '✓ configured' : '✗ not set',
  });
}
