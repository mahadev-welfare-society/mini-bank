# Email Notification Setup Guide

This guide explains how to configure email notifications for Mahadev Welfare Society.

## Overview

The Mahadev Welfare Society application sends automated email notifications in the following scenarios:

1. **Customer Creation**: When a new customer is created, they receive a welcome email with their User ID, Email, and Password.
2. **Account Creation**: When a new account (Savings, RD, FD, or Loan) is created for a customer, they receive an email notification with account details.

## Email Configuration

### Environment Variables

Add the following variables to your `.env` file or environment:

```bash
# Email Configuration (Optional - emails will be skipped if not configured)
SMTP_SERVER=smtp.gmail.com          # SMTP server address
SMTP_PORT=587                       # SMTP port (587 for TLS, 465 for SSL)
SMTP_USERNAME=your-email@gmail.com  # Your email address
SMTP_PASSWORD=your-app-password     # App-specific password (NOT regular password)
SMTP_USE_TLS=true                   # Use TLS encryption (true/false)
FROM_EMAIL=your-email@gmail.com     # Sender email address
FROM_NAME=Mahadev Welfare Society   # Sender name
FRONTEND_URL=http://localhost:3000  # Frontend URL for login links
```

### Setting up Gmail SMTP

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Mahadev Welfare Society" as the name
   - Copy the 16-character password
   - Use this as your `SMTP_PASSWORD`

3. **Configure your `.env` file**:
   ```bash
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # The 16-character app password
   SMTP_USE_TLS=true
   FROM_EMAIL=your-email@gmail.com
   FROM_NAME=Mahadev Welfare Society
   ```

### Using Other Email Providers

#### Outlook/Hotmail
```bash
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USE_TLS=true
```

#### Yahoo Mail
```bash
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USE_TLS=true
```

#### Custom SMTP Server
```bash
SMTP_SERVER=mail.yourdomain.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yourdomain.com
SMTP_PASSWORD=your-password
SMTP_USE_TLS=true
```

## Testing Email Configuration

### Option 1: Test via Customer Creation
1. Create a new customer through the admin panel
2. Check the customer's email inbox for the welcome email
3. Check server logs for email sending status

### Option 2: Test via Account Creation
1. Create a new account (Savings, RD, FD, or Loan) for a customer
2. Check the customer's email inbox for the account creation notification
3. Check server logs for email sending status

## Email Templates

### Customer Welcome Email
- **Subject**: "Welcome to Mahadev Welfare Society - Your Account Has Been Created"
- **Contents**:
  - Customer name
  - User ID
  - Email address
  - Password (plain text - only sent once at creation)
  - Login URL
  - Security notice

### Account Creation Email
- **Subject**: "New [Account Type] Account Created - Mahadev Welfare Society"
- **Contents**:
  - Customer name
  - Account type (Savings, RD, FD, Loan)
  - Account ID
  - Account-specific details:
    - **Loan**: EMI amount, tenure, interest rate, due day
    - **RD**: Contribution amount, contribution day, term, interest rate
    - **FD**: Term, maturity date, interest rate, deposit amount
    - **Savings**: Balance, interest rate
  - Login URL

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Configuration**:
   - Verify all environment variables are set correctly
   - Ensure SMTP credentials are correct
   - For Gmail, make sure you're using an App Password, not your regular password

2. **Check Server Logs**:
   - Look for email-related errors in the Flask logs
   - Email sending failures don't block customer/account creation

3. **Test SMTP Connection**:
   - Try sending a test email using Python:
   ```python
   import smtplib
   server = smtplib.SMTP('smtp.gmail.com', 587)
   server.starttls()
   server.login('your-email@gmail.com', 'your-app-password')
   ```

### Common Issues

1. **"Authentication failed"**: 
   - For Gmail: Use App Password, not regular password
   - Check if 2FA is enabled

2. **"Connection refused"**: 
   - Check SMTP server address and port
   - Verify firewall settings

3. **Emails going to spam**:
   - This is normal for automated emails
   - Consider using a dedicated email service (SendGrid, Mailgun, etc.) for production

## Production Recommendations

For production environments, consider:

1. **Dedicated Email Service**: Use services like:
   - SendGrid
   - Mailgun
   - Amazon SES
   - Postmark

2. **Email Queue**: Implement background task queue (Celery, RQ) for async email sending

3. **Email Templates**: Use template engines for better email design

4. **Email Tracking**: Track email delivery and open rates

## Security Notes

- **Passwords are sent in plain text** only during customer creation (one-time email)
- Customers are advised to change passwords after first login
- Never store passwords in logs or share via other channels
- Consider implementing password reset functionality instead of sending passwords

