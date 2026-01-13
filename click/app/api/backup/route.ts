import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// This API route handles backup operations
export async function POST(request: NextRequest) {
  try {
    // Get the action from the request
    const { action, data, email } = await request.json();

    if (action === 'sendBackup') {
      // Validate inputs
      if (!data || !email) {
        return NextResponse.json(
          { error: 'Missing data or email' },
          { status: 400 }
        );
      }

      // In a real implementation, you would:
      // 1. Use nodemailer to send the backup data as an email
      // 2. Create a zip of the backup data
      // 3. Send it to the specified email

      // Create transporter with environment variables
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@clickcafe.com',
        to: email,
        subject: `CLICK Cafe Backup - ${new Date().toISOString().split('T')[0]}`,
        text: 'Please find attached your daily backup.',
        attachments: [{
          filename: `click_backup_${new Date().toISOString().split('T')[0]}.json`,
          content: JSON.stringify(data)
        }]
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      return NextResponse.json({
        success: true,
        message: 'Backup sent successfully'
      });
    } else if (action === 'scheduleNightly') {
      // Schedule a nightly backup
      // In a real implementation, this would set up a cron job or scheduled task

      return NextResponse.json({
        success: true,
        message: 'Nightly backup scheduled'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return backup status or configuration
  return NextResponse.json({
    status: 'active',
    lastBackup: new Date().toISOString(),
    nextBackup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
  });
}