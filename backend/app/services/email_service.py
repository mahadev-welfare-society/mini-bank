"""
Email Service for Mini-Bank Application
Handles sending emails for customer creation and account creation notifications
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
import logging
from typing import Optional, Dict
import threading
import time
import socket

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""
    
    @staticmethod
    def get_smtp_config():
        """Get SMTP configuration from environment variables"""
        # Support both TLS (port 587) and SSL (port 465)
        use_ssl = os.environ.get('SMTP_USE_SSL', 'false').lower() == 'true'
        default_port = 465 if use_ssl else 587
        
        config = {
            'smtp_server': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
            'smtp_port': int(os.environ.get('SMTP_PORT', default_port)),
            'smtp_username': os.environ.get('SMTP_USERNAME', ''),
            'smtp_password': os.environ.get('SMTP_PASSWORD', ''),
            'from_email': os.environ.get('FROM_EMAIL', os.environ.get('SMTP_USERNAME', 'noreply@minibank.com')),
            'from_name': os.environ.get('FROM_NAME', 'Mahadev Welfare Society'),
            'use_tls': os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true' if not use_ssl else False,
            'use_ssl': use_ssl
        }
        # Log configuration status (without exposing password)
        logger.info(f'SMTP Config - Server: {config["smtp_server"]}, Port: {config["smtp_port"]}, Username: {config["smtp_username"]}, SSL: {config["use_ssl"]}, TLS: {config["use_tls"]}, Password Set: {"Yes" if config["smtp_password"] else "No"}')
        logger.info(f'Environment: {os.environ.get("FLASK_ENV", "unknown")}')
        return config
    
    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            config = EmailService.get_smtp_config()
            
            # Skip sending if SMTP is not configured
            if not config['smtp_username'] or not config['smtp_password']:
                logger.warning(f'SMTP not configured. Skipping email to {to_email}')
                logger.warning(f'SMTP_USERNAME: {"SET" if config["smtp_username"] else "NOT SET"}')
                logger.warning(f'SMTP_PASSWORD: {"SET" if config["smtp_password"] else "NOT SET"}')
                logger.info(f'Email that would have been sent:\nTo: {to_email}\nSubject: {subject}\nBody: {text_body or html_body}')
                return True  # Return True to not block the process if email fails
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = formataddr((config['from_name'], config['from_email']))
            msg['To'] = to_email
            
            # Add text and HTML parts
            if text_body:
                text_part = MIMEText(text_body, 'plain')
                msg.attach(text_part)
            
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            # Try connecting with retry logic (for temporary network issues)
            max_retries = 3
            retry_delay = 2  # seconds
            
            for attempt in range(1, max_retries + 1):
                try:
                    logger.info(f'Attempt {attempt}/{max_retries}: Connecting to SMTP server {config["smtp_server"]}:{config["smtp_port"]}')
                    
                    # First, try to check if we can resolve the hostname
                    try:
                        socket.gethostbyname(config['smtp_server'])
                        logger.info(f'DNS resolution successful for {config["smtp_server"]}')
                    except socket.gaierror as dns_error:
                        logger.error(f'DNS resolution failed for {config["smtp_server"]}: {dns_error}')
                        if attempt < max_retries:
                            logger.info(f'Retrying in {retry_delay} seconds...')
                            time.sleep(retry_delay)
                            continue
                        else:
                            raise
                    
                    # Use longer timeout for cloud environments
                    smtp_timeout = 30
                    
                    # Try to connect to SMTP server (SSL or TLS)
                    if config['use_ssl']:
                        logger.info(f'Connecting via SSL (port {config["smtp_port"]})...')
                        server = smtplib.SMTP_SSL(config['smtp_server'], config['smtp_port'], timeout=smtp_timeout)
                    else:
                        logger.info(f'Connecting via SMTP (port {config["smtp_port"]})...')
                        server = smtplib.SMTP(config['smtp_server'], config['smtp_port'], timeout=smtp_timeout)
                    
                    try:
                        logger.info(f'Connected to SMTP server successfully')
                        if config['use_tls'] and not config['use_ssl']:
                            logger.info('Starting TLS...')
                            server.starttls()
                            logger.info('TLS started successfully')
                        
                        logger.info(f'Logging in with username: {config["smtp_username"]}')
                        server.login(config['smtp_username'], config['smtp_password'])
                        logger.info('SMTP login successful')
                        
                        logger.info(f'Sending email to {to_email}...')
                        server.send_message(msg)
                        logger.info(f'Email sent successfully to {to_email}')
                    finally:
                        server.quit()
                    
                    return True
                    
                except (OSError, ConnectionError, socket.error) as network_error:
                    error_msg = str(network_error)
                    logger.warning(f'Attempt {attempt}/{max_retries} failed: Network error - {type(network_error).__name__}: {error_msg}')
                    
                    if attempt < max_retries:
                        logger.info(f'Retrying in {retry_delay} seconds...')
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        # Final attempt failed, raise to be caught by outer exception handler
                        raise
            
        except (OSError, ConnectionError, socket.error) as e:
            # Network errors (common on Render free tier with SMTP restrictions)
            error_msg = str(e)
            error_code = getattr(e, 'errno', None)
            logger.error(f'Network Error sending email to {to_email} after {max_retries} attempts: {type(e).__name__}: {error_msg}')
            if error_code:
                logger.error(f'Error code: {error_code}')
                if error_code == 101:
                    logger.error('ERRNO 101: Network is unreachable - This usually means:')
                    logger.error('  1. Render cannot reach the SMTP server (firewall/network restriction)')
                    logger.error('  2. SMTP server hostname is incorrect or DNS resolution failed')
                    logger.error('  3. SMTP port is blocked by Render or ISP')
                    logger.error('  4. SMTP provider (Gmail) may have blocked Render IPs')
            logger.warning(f'Possible solutions:')
            logger.warning(f'  1. Try using SSL instead of TLS: Set SMTP_PORT=465 and SMTP_USE_SSL=true')
            logger.warning(f'  2. Check if SMTP settings are correct in Render environment variables')
            logger.warning(f'  3. Verify Gmail App Password is correct and not expired')
            logger.warning(f'  4. Try using a different SMTP server (SendGrid, Mailgun, etc.)')
            logger.warning(f'  5. Consider using a cloud email service API instead of SMTP')
            logger.info(f'Email sending skipped - customer creation will continue')
            return False  # Return False but don't block customer creation
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f'SMTP Authentication Error: {e}')
            logger.error(f'Check if SMTP_USERNAME and SMTP_PASSWORD are correct')
            logger.error(f'For Gmail, make sure you are using an App Password, not your regular password')
            logger.info(f'Email sending skipped - customer creation will continue')
            return False
        except smtplib.SMTPConnectError as e:
            logger.error(f'SMTP Connection Error: {e}')
            logger.error(f'Could not connect to {config.get("smtp_server", "SMTP server")}:{config.get("smtp_port", "port")}')
            logger.warning(f'This may indicate network restrictions or incorrect SMTP configuration')
            logger.info(f'Email sending skipped - customer creation will continue')
            return False
        except smtplib.SMTPException as e:
            logger.error(f'SMTP Error: {e}')
            logger.info(f'Email sending skipped - customer creation will continue')
            return False
        except Exception as e:
            logger.error(f'Error sending email to {to_email}: {type(e).__name__}: {e}')
            import traceback
            logger.error(f'Traceback: {traceback.format_exc()}')
            logger.info(f'Email sending skipped - customer creation will continue')
            return False
    
    @staticmethod
    def send_customer_welcome_email(
        customer_email: str,
        customer_name: str,
        customer_id: int,
        password: str,
        role: str = 'staff',
        login_url: Optional[str] = None
    ) -> bool:
        """
        Send welcome email to newly created customer/manager
        
        Args:
            customer_email: Customer email address
            customer_name: Customer name
            customer_id: Customer ID (user ID for login)
            password: Customer password (plain text - only sent once at creation, only for managers)
            role: User role ('manager' or 'staff') - determines email content
            login_url: Login page URL (optional, only for managers)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not login_url:
            login_url = os.environ.get('FRONTEND_URL', 'https://mini-bank-project.vercel.app') + '/login'
        
        # Pre-fill email only (password not in URL for security) - only for managers
        from urllib.parse import urlencode
        params = {
            'email': customer_email
        }
        login_url_with_params = f"{login_url}?{urlencode(params)}"
        
        subject = 'Welcome to Mahadev Welfare Society - Your Account Has Been Created'
        
        # Manager email template (with credentials and login link)
        if role == 'manager':
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }}
                    .content {{
                        background: #f9f9f9;
                        padding: 30px;
                        border: 1px solid #ddd;
                    }}
                    .credentials {{
                        background: white;
                        border: 2px solid #667eea;
                        border-radius: 5px;
                        padding: 20px;
                        margin: 20px 0;
                    }}
                    .credential-item {{
                        margin: 10px 0;
                        padding: 10px;
                        background: #f0f0f0;
                        border-radius: 3px;
                    }}
                    .label {{
                        font-weight: bold;
                        color: #667eea;
                    }}
                    .value {{
                        font-family: monospace;
                        font-size: 16px;
                        color: #333;
                    }}
                    .warning {{
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                    }}
                    .button {{
                        display: inline-block;
                        padding: 12px 30px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }}
                    .footer {{
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-size: 12px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Welcome to Mahadev Welfare Society!</h1>
                </div>
                <div class="content">
                    <p>Dear {customer_name},</p>
                    
                    <p>Your account has been successfully created on Mahadev Welfare Society. Below are your login credentials:</p>
                    
                    <div class="credentials">
                        <div class="credential-item">
                            <span class="label">Email:</span><br>
                            <span class="value">{customer_email}</span>
                        </div>
                        <div class="credential-item">
                            <span class="label">Password:</span><br>
                            <span class="value">{password}</span>
                        </div>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        Never share your credentials with anyone.
                    </div>
                    
                    <p>You can now log in to your Mahadev Welfare Society account using the credentials above:</p>
                    
                    <div style="text-align: center;">
                        <a href="{login_url_with_params}" class="button">Login to Mahadev Welfare Society</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #666; text-align: center; margin-top: 15px;">
                        Clicking the button above will pre-fill your email. Enter your password to login.
                    </p>
                    
                    <p>If you have any questions or need assistance, please contact our support team.</p>
                    
                    <p>Best regards,<br>
                    Mahadev Welfare Society Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; {os.environ.get('CURRENT_YEAR', '2025')} Mahadev Welfare Society. All rights reserved.</p>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
Welcome to Mahadev Welfare Society!

Dear {customer_name},

Your account has been successfully created on Mahadev Welfare Society. Below are your login credentials:

Email: {customer_email}
Password: {password}

⚠️ Security Notice:
Never share your credentials with anyone.

You can now log in to your Mahadev Welfare Society account using the credentials above.
Login URL: {login_url_with_params}

Note: The login link above will pre-fill your email. Enter your password to complete login.

If you have any questions or need assistance, please contact our support team.

Best regards,
Mahadev Welfare Society Team

---
This is an automated message. Please do not reply to this email.
© {os.environ.get('CURRENT_YEAR', '2025')} Mahadev Welfare Society. All rights reserved.
            """
        else:
            # Staff/Customer email template (welcome only, no credentials or login links)
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }}
                    .content {{
                        background: #f9f9f9;
                        padding: 30px;
                        border: 1px solid #ddd;
                    }}
                    .footer {{
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-size: 12px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Welcome to Mahadev Welfare Society!</h1>
                </div>
                <div class="content">
                    <p>Dear {customer_name},</p>
                    
                    <p>Your account has been successfully created on Mahadev Welfare Society.</p>
                    
                    <p>We are pleased to have you as part of our banking family. Your account is now active and ready to use.</p>
                    
                    <p>If you have any questions or need assistance, please contact our support team.</p>
                    
                    <p>Best regards,<br>
                    Mahadev Welfare Society Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; {os.environ.get('CURRENT_YEAR', '2025')} Mahadev Welfare Society. All rights reserved.</p>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
Welcome to Mahadev Welfare Society!

Dear {customer_name},

Your account has been successfully created on Mahadev Welfare Society.

We are pleased to have you as part of our banking family. Your account is now active and ready to use.

If you have any questions or need assistance, please contact our support team.

Best regards,
Mahadev Welfare Society Team

---
This is an automated message. Please do not reply to this email.
© {os.environ.get('CURRENT_YEAR', '2025')} Mahadev Welfare Society. All rights reserved.
            """
        
        return EmailService.send_email(
            to_email=customer_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )
    
    @staticmethod
    def send_account_creation_email(
        customer_email: str,
        customer_name: str,
        account_type: str,
        account_id: int,
        account_details: Optional[Dict] = None,
        login_url: Optional[str] = None
    ) -> bool:
        """
        Send email notification when a new account is created for a customer
        
        Args:
            customer_email: Customer email address
            customer_name: Customer name
            account_type: Type of account (Savings, RD, FD, Loan)
            account_id: Account ID
            account_details: Additional account details (balance, interest rate, etc.)
            login_url: Login page URL (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not login_url:
            login_url = os.environ.get('FRONTEND_URL', 'https://mini-bank-project.vercel.app') + '/login'
        
        # Format account details
        account_info_html = ""
        account_info_text = ""
        
        if account_details:
            details_list = []
            details_text_list = []
            
            if account_details.get('balance') is not None:
                balance = account_details.get('balance', 0)
                if account_type.lower() == 'loan':
                    balance_text = f"Outstanding Loan Amount: ₹{abs(balance):,.2f}"
                else:
                    balance_text = f"Balance: ₹{balance:,.2f}"
                details_list.append(f"<li><strong>{balance_text}</strong></li>")
                details_text_list.append(balance_text)
            
            if account_details.get('interest_rate'):
                rate = account_details.get('interest_rate')
                details_list.append(f"<li>Interest Rate: {rate}% per annum</li>")
                details_text_list.append(f"Interest Rate: {rate}% per annum")
            
            if account_type.lower() == 'loan' and account_details.get('emi_amount'):
                emi = account_details.get('emi_amount')
                term = account_details.get('term_months', account_details.get('loan_term_months'))
                details_list.append(f"<li>Monthly EMI: ₹{emi:,.2f}</li>")
                if term:
                    details_list.append(f"<li>Loan Tenure: {term} months</li>")
                details_text_list.append(f"Monthly EMI: ₹{emi:,.2f}")
                if term:
                    details_text_list.append(f"Loan Tenure: {term} months")
            
            if account_type.upper() == 'RD' and account_details.get('contribution_amount'):
                contrib = account_details.get('contribution_amount')
                contrib_day = account_details.get('contribution_day')
                details_list.append(f"<li>Monthly Contribution: ₹{contrib:,.2f}</li>")
                if contrib_day:
                    details_list.append(f"<li>Contribution Day: {contrib_day} of each month</li>")
                details_text_list.append(f"Monthly Contribution: ₹{contrib:,.2f}")
                if contrib_day:
                    details_text_list.append(f"Contribution Day: {contrib_day} of each month")
            
            if account_type.upper() == 'FD' and account_details.get('term_days'):
                term_days = account_details.get('term_days')
                maturity_date = account_details.get('maturity_date')
                details_list.append(f"<li>Term: {term_days} days</li>")
                if maturity_date:
                    details_list.append(f"<li>Maturity Date: {maturity_date}</li>")
                details_text_list.append(f"Term: {term_days} days")
                if maturity_date:
                    details_text_list.append(f"Maturity Date: {maturity_date}")
            
            if details_list:
                account_info_html = f"<ul>{''.join(details_list)}</ul>"
                account_info_text = "\n".join(details_text_list)
        
        # Account type display name
        account_type_names = {
            'Savings': 'Savings Account',
            'RD': 'Recurring Deposit (RD) Account',
            'FD': 'Fixed Deposit (FD) Account',
            'DDS': 'Daily Deposit Scheme (DDS) Account',
            'Loan': 'Loan Account'
        }
        account_display_name = account_type_names.get(account_type, f'{account_type} Account')
        
        subject = f'New {account_display_name} Created - Mahadev Welfare Society'
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border: 1px solid #ddd;
                }}
                .account-box {{
                    background: white;
                    border: 2px solid #667eea;
                    border-radius: 5px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .account-id {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #667eea;
                    text-align: center;
                    margin: 10px 0;
                }}
                .account-details {{
                    margin: 15px 0;
                }}
                .account-details ul {{
                    list-style: none;
                    padding: 0;
                }}
                .account-details li {{
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }}
                .account-details li:last-child {{
                    border-bottom: none;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background: #667eea;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #666;
                    font-size: 12px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>New Account Created</h1>
            </div>
            <div class="content">
                <p>Dear {customer_name},</p>
                
                <p>A new <strong>{account_display_name}</strong> has been created for you.</p>
                
                <div class="account-box">
                    <div class="account-id">Account ID: #{account_id}</div>
                    <div class="account-details">
                        {account_info_html if account_info_html else '<p>Account details will be available after activation.</p>'}
                    </div>
                </div>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <p>Best regards,<br>
                Mahadev Welfare Society Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; {os.environ.get('CURRENT_YEAR', '2025')} Mahadev Welfare Society. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
New Account Created

Dear {customer_name},

A new {account_display_name} has been created for you.

Account ID: #{account_id}

{account_info_text if account_info_text else 'Account details will be available after activation.'}

If you have any questions or need assistance, please contact our support team.

If you have any questions or need assistance, please contact our support team.

Best regards,
Mahadev Welfare Society Team

---
This is an automated message. Please do not reply to this email.
© {os.environ.get('CURRENT_YEAR', '2025')} Mahadev Welfare Society. All rights reserved.
        """
        
        return EmailService.send_email(
            to_email=customer_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )
    
    @staticmethod
    def send_transaction_notification_email(
        customer_email: str,
        customer_name: str,
        transaction_type: str,
        amount: float,
        account_type: str,
        account_number: str,
        balance_before: float,
        balance_after: float,
        reference_number: str,
        description: Optional[str] = None,
        transaction_date: Optional[str] = None,
        login_url: Optional[str] = None
    ) -> bool:
        """
        Send email notification when a transaction occurs on customer account
        
        Args:
            customer_email: Customer email address
            customer_name: Customer name
            transaction_type: Type of transaction (deposit, withdrawal, interest, penalty, loan_disbursal, loan_repayment)
            amount: Transaction amount
            account_type: Account type (Savings, RD, FD, DDS, Loan)
            account_number: Account number/ID
            balance_before: Balance before transaction
            balance_after: Balance after transaction
            reference_number: Transaction reference number
            description: Transaction description (optional)
            transaction_date: Transaction date (optional)
            login_url: Login page URL (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not login_url:
            login_url = os.environ.get('FRONTEND_URL', 'https://mini-bank-project.vercel.app') + '/login'
        
        # Format transaction type for display
        transaction_type_names = {
            'deposit': 'Deposit',
            'withdrawal': 'Withdrawal',
            'interest': 'Interest Credit',
            'penalty': 'Penalty Charge',
            'loan_disbursal': 'Loan Disbursal',
            'loan_repayment': 'Loan Repayment'
        }
        transaction_display_name = transaction_type_names.get(transaction_type, transaction_type.title())
        
        # Determine if amount is credit or debit
        is_credit = transaction_type in ['deposit', 'interest', 'loan_disbursal']
        amount_color = '#28a745' if is_credit else '#dc3545'
        amount_sign = '+' if is_credit else '-'
        
        # Format date
        if not transaction_date:
            from datetime import datetime
            transaction_date = datetime.now().strftime('%B %d, %Y at %I:%M %p')
        
        # Format account type
        account_type_names = {
            'Savings': 'Savings Account',
            'RD': 'Recurring Deposit (RD) Account',
            'FD': 'Fixed Deposit (FD) Account',
            'DDS': 'Daily Deposit Scheme (DDS) Account',
            'Loan': 'Loan Account'
        }
        account_display_name = account_type_names.get(account_type, f'{account_type} Account')
        
        # Special handling for loan accounts
        if account_type == 'Loan':
            balance_text = f"Outstanding Loan Amount: ₹{abs(balance_after):,.2f}"
        else:
            balance_text = f"Account Balance: ₹{balance_after:,.2f}"
        
        subject = f'Transaction Alert: {transaction_display_name} - Mahadev Welfare Society'
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border: 1px solid #ddd;
                }}
                .transaction-box {{
                    background: white;
                    border: 2px solid #667eea;
                    border-radius: 5px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .transaction-type {{
                    font-size: 20px;
                    font-weight: bold;
                    color: #667eea;
                    text-align: center;
                    margin: 10px 0;
                }}
                .amount {{
                    font-size: 32px;
                    font-weight: bold;
                    color: {amount_color};
                    text-align: center;
                    margin: 15px 0;
                }}
                .transaction-details {{
                    margin: 15px 0;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 5px;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e0e0e0;
                }}
                .detail-row:last-child {{
                    border-bottom: none;
                }}
                .detail-label {{
                    font-weight: bold;
                    color: #666;
                }}
                .detail-value {{
                    color: #333;
                }}
                .balance-info {{
                    background: #e8f5e9;
                    border-left: 4px solid #28a745;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .balance-amount {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #28a745;
                    text-align: center;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background: #667eea;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #666;
                    font-size: 12px;
                }}
                .info-box {{
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Transaction Alert</h1>
            </div>
            <div class="content">
                <p>Dear {customer_name},</p>
                
                <p>A transaction has been processed on your <strong>{account_display_name}</strong>.</p>
                
                <div class="transaction-box">
                    <div class="transaction-type">{transaction_display_name}</div>
                    <div class="amount">{amount_sign}₹{amount:,.2f}</div>
                    
                    <div class="transaction-details">
                        <div class="detail-row">
                            <span class="detail-label">Account Type:</span>
                            <span class="detail-value">{account_display_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Account Number:</span>
                            <span class="detail-value">#{account_number}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Reference Number:</span>
                            <span class="detail-value">{reference_number}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Transaction Date:</span>
                            <span class="detail-value">{transaction_date}</span>
                        </div>
                        {f'<div class="detail-row"><span class="detail-label">Description:</span><span class="detail-value">{description}</span></div>' if description else ''}
                    </div>
                </div>
                
                <div class="balance-info">
                    <div style="text-align: center; margin-bottom: 10px;">
                        <strong>Balance Before:</strong> ₹{balance_before:,.2f}
                    </div>
                    <div class="balance-amount">
                        {balance_text}
                    </div>
                </div>
                
                {f'<div class="info-box"><strong>Note:</strong> {description}</div>' if description and ("break" in description.lower() or "transfer" in description.lower() or "maturity" in description.lower()) else ''}
                
                <p>If you did not initiate this transaction, please contact our support team immediately.</p>
                
                <p>Best regards,<br>
                Mahadev Welfare Society Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; {os.environ.get('CURRENT_YEAR', '2025')} Mahadev Welfare Society. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
Transaction Alert - Mahadev Welfare Society

Dear {customer_name},

A transaction has been processed on your {account_display_name}.

Transaction Type: {transaction_display_name}
Amount: {amount_sign}₹{amount:,.2f}

Account Details:
- Account Type: {account_display_name}
- Account Number: #{account_number}
- Reference Number: {reference_number}
- Transaction Date: {transaction_date}
{f'- Description: {description}' if description else ''}

Balance Information:
- Balance Before: ₹{balance_before:,.2f}
- {balance_text}

{f'Note: {description}' if description and ("break" in description.lower() or "transfer" in description.lower() or "maturity" in description.lower()) else ''}

If you did not initiate this transaction, please contact our support team immediately.

Best regards,
Mahadev Welfare Society Team

---
This is an automated message. Please do not reply to this email.
© {os.environ.get('CURRENT_YEAR', '2025')} Mahadev Welfare Society. All rights reserved.
        """
        
        return EmailService.send_email(
            to_email=customer_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

