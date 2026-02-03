from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS, cross_origin
from config import config
from app.scheduler import scheduler
import cloudinary
import cloudinary.uploader
import os

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # -------------------------------
    # Cloudinary Configuration
    # -------------------------------
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )
    
    # Force database URL from environment variable
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        print(f"Using DATABASE_URL from environment: {database_url[:50]}...")
    else:
        print("WARNING: DATABASE_URL not found in environment!")
        print(f"Using default database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")
    
    # Handle trailing slashes
    app.url_map.strict_slashes = False
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    
    # CORS configuration
    allowed_origins = [
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost:5173', 
        'http://localhost:3001',
        'https://mini-bank-project.vercel.app'  # Production frontend URL
    ]
    
    # Add production frontend URL from environment variable if available
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        # Add with and without trailing slash
        clean_url = frontend_url.rstrip('/')
        if clean_url not in allowed_origins:
            allowed_origins.append(clean_url)
    
    # Function to check if origin is allowed (for dynamic checking in after_request)
    def is_origin_allowed(origin):
        if not origin:
            return False
        # Exact match
        if origin in allowed_origins:
            return True
        # Allow localhost on any port (for development)
        if origin.startswith('http://localhost:') or origin.startswith('http://127.0.0.1:'):
            return True
        # Allow vercel.app domains (for production)
        if 'vercel.app' in origin:
            return True
        return False
    
    # Use list for CORS (Flask-CORS expects iterable, not function)
    # We'll handle dynamic checking in after_request hook
    CORS(app, 
         origins=allowed_origins,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
         expose_headers=['Content-Range', 'X-Content-Range'],
         max_age=3600)
    
    # Add CORS headers to all responses (handle dynamic origin checking here)
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        if origin and is_origin_allowed(origin):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With,Accept,Origin'
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
            response.headers['Access-Control-Max-Age'] = '3600'
        return response
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.customers import customers_bp
    from app.routes.account_types import account_types_bp
    from app.routes.accounts import accounts_bp
    from app.routes.user_management import user_management_bp
    from app.routes.transactions import transaction_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.payments import payment_bp
    from app.routes.interest_logs import interest_log_bp
    from .models import RDInstallment

    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(account_types_bp, url_prefix='/api/account-types')
    app.register_blueprint(accounts_bp, url_prefix='/api/accounts')
    app.register_blueprint(user_management_bp, url_prefix='/api/user-management')
    app.register_blueprint(transaction_bp, url_prefix='/api/transactions')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')
    app.register_blueprint(interest_log_bp, url_prefix='/api/interest-logs')

    
    # Error handlers
    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    # Init Scheduler
    scheduler.init_app(app)
    scheduler.start()

    from app.jobs import midnight_interest_job

    # Wrap the job with app context
    def job_wrapper():
        with app.app_context():
            print("Running daily interest jobs (DDS + FD)...")
            midnight_interest_job()

    scheduler.add_job(
        id='dds_daily_interest',
        func=job_wrapper,  # use wrapper
        trigger='cron',
        hour=0,
        minute=1
    )

    from app.jobs import monthly_interest_job

    def rd_job_wrapper():
         with app.app_context():
          print("Running monthly RD job...")
          monthly_interest_job()


    scheduler.add_job(
        id='rd_monthly_job',
        func=rd_job_wrapper,
        trigger='cron',
        day=30,
        hour=0,
        minute=1
    )

    
    return app
