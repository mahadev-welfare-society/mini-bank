import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    # Use DATABASE_URL from environment, fallback to localhost for development
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://postgres:root@localhost:5432/minibank_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = False
    
    # Email configuration (optional - emails will be skipped if not configured)
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SMTP_USE_TLS = os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true'
    FROM_EMAIL = os.environ.get('FROM_EMAIL', os.environ.get('SMTP_USERNAME', 'noreply@minibank.com'))
    FROM_NAME = os.environ.get('FROM_NAME', 'Mini Bank')
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://mini-bank-project.vercel.app')
    
    # Razorpay Payment Gateway Configuration
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
    RAZORPAY_TEST_MODE = os.environ.get('RAZORPAY_TEST_MODE', 'true').lower() == 'true'
    
    @staticmethod
    def init_app(app):
        # Debug database connection in production
        if os.environ.get('FLASK_ENV') == 'production':
            print(f"Database URL: {os.environ.get('DATABASE_URL', 'NOT SET')}")

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
