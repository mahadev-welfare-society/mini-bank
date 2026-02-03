# Mahadev Welfare Society - Banking System

A modern banking system built with Flask (backend) and React (frontend) featuring JWT authentication and customer management.

## 🏗️ Architecture

- **Backend**: Flask + PostgreSQL + SQLAlchemy + JWT
- **Frontend**: React + Vite + Tailwind CSS
- **Authentication**: JWT tokens with role-based access control
- **Database**: PostgreSQL with migrations

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+

### Automated Setup (Recommended)

```bash
# Run the setup script
./setup.sh
```

### Manual Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**
   ```bash
   # Create .env file with:
   FLASK_ENV=development
   DATABASE_URL=postgresql://postgres:root@localhost:5432/minibank_db
   JWT_SECRET_KEY=supersecretkey
   FLASK_APP=main.py
   ```

5. **Setup PostgreSQL database**
   ```bash
   # Create database
   createdb minibank_db
   ```

6. **Initialize database**
   ```bash
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

7. **Create admin user and sample data**
   ```bash
   python -c "
   from app import create_app, db
   from app.models import User, Customer
   app = create_app()
   with app.app_context():
       # Create admin user
       admin = User(name='Admin User', email='admin@minibank.com', role='admin')
       admin.set_password('admin123')
       db.session.add(admin)
       
       # Create manager user
       manager = User(name='Manager User', email='manager@minibank.com', role='manager')
       manager.set_password('manager123')
       db.session.add(manager)
       
       # Create staff user
       staff = User(name='Staff User', email='staff@minibank.com', role='staff')
       staff.set_password('staff123')
       db.session.add(staff)
       
       # Create sample customers
       customers = [
           Customer(name='John Doe', email='john.doe@email.com', phone='+1-555-0123', address='123 Main St, New York, NY 10001', created_by=admin.id),
           Customer(name='Jane Smith', email='jane.smith@email.com', phone='+1-555-0124', address='456 Oak Ave, Los Angeles, CA 90210', created_by=admin.id),
           Customer(name='Bob Johnson', email='bob.johnson@email.com', phone='+1-555-0125', address='789 Pine St, Chicago, IL 60601', created_by=admin.id)
       ]
       for customer in customers:
           db.session.add(customer)
       
       db.session.commit()
       print('✅ Users and sample data created successfully!')
   "
   ```

8. **Run backend**
   ```bash
   flask run --host=0.0.0.0 --port=5000
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   # Create .env file with:
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

4. **Run frontend**
   ```bash
   npm run dev
   ```

## 🔐 Default Login Credentials

- **Email**: admin@minibank.com
- **Password**: admin123
- **Role**: admin

## 📋 Features Implemented

### Authentication
- ✅ JWT-based authentication
- ✅ Role-based access control (admin, manager, staff)
- ✅ Protected routes
- ✅ User registration (admin only)

### Customer Management
- ✅ Create customers (admin/manager)
- ✅ View all customers (role-based)
- ✅ Edit customers (permission-based)
- ✅ Delete customers (permission-based)
- ✅ Search and filter customers

### UI/UX
- ✅ Modern, responsive design with Tailwind CSS
- ✅ Clean dashboard layout
- ✅ Form validation and error handling
- ✅ Toast notifications
- ✅ Loading states

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/profile` - Get user profile

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer (admin/manager)
- `GET /api/customers/<id>` - Get customer
- `PUT /api/customers/<id>` - Update customer
- `DELETE /api/customers/<id>` - Delete customer

## 🔒 Role Permissions

### Admin
- Full access to all features
- Can create users
- Can manage all customers

### Manager
- Can create customers
- Can manage all customers
- Cannot create users

### Staff
- Can only manage customers they created
- Cannot create new customers

## 📁 Project Structure

```
mini-bank/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   └── customer.py
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   └── customers.py
│   │   ├── controllers/
│   │   │   ├── auth_controller.py
│   │   │   └── customer_controller.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   └── customer_service.py
│   │   └── utils/
│   │       ├── decorators.py
│   │       └── error_handlers.py
│   ├── migrations/
│   ├── config.py
│   ├── main.py
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── DashboardLayout.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── CustomerList.jsx
│   │   │   └── CustomerForm.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── store/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── postcss.config.js
├── setup.sh
└── README.md
```

## 🚀 Deployment

### Backend
1. Set `FLASK_ENV=production`
2. Update `DATABASE_URL` for production database
3. Set secure `JWT_SECRET_KEY`
4. Run with production WSGI server (gunicorn)

### Frontend
1. Build for production: `npm run build`
2. Serve static files with nginx or similar
3. Update API base URL for production

## 🧪 Testing

### Backend Testing
```bash
cd backend
python -m pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 📝 Development Notes

- All API responses follow standard format: `{success, message, data}`
- JWT tokens are stored in localStorage
- Role-based access is enforced on both frontend and backend
- Database migrations are handled by Flask-Migrate
- CORS is enabled for development

## 🔧 Troubleshooting

### Common Issues

1. **Database connection error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Verify database exists

2. **JWT token errors**
   - Check JWT_SECRET_KEY is set
   - Ensure token is not expired

3. **CORS errors**
   - Verify backend CORS is enabled
   - Check API base URL in frontend

4. **Permission denied**
   - Check user role and permissions
   - Verify JWT token is valid

## 📞 Support

For issues or questions, please check the troubleshooting section above or create an issue in the repository.
