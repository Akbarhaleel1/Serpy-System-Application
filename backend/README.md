# Print Arts Flow - Backend API

A Node.js backend API for the Print Arts Flow management system, built with Express.js and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Business Logic**: Complete CRUD operations for all business entities
- **Real-time Data**: MongoDB integration for scalable data management
- **Security**: Comprehensive security middleware including rate limiting, CORS, and data sanitization
- **API Documentation**: RESTful API design with logical endpoint organization
- **File Management**: File upload capabilities (ready for integration with Cloudinary)
- **WhatsApp Integration**: Ready for WhatsApp Business API integration

## Tech Stack

- **Runtime**: Node.js (18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting, Data sanitization
- **File Upload**: Multer (ready for Cloudinary)
- **PDF Generation**: Puppeteer (equivalent to Supabase functions)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB 4.4 or higher
- npm or yarn package manager

### Installation

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   ```bash
   cp env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/print_arts_flow
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRE=24h
   ```

4. **Start MongoDB**:
   Make sure MongoDB is running on your system.

5. **Run the application**:
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:5000`

### Health Check

Test the API is running:
```bash
curl http://localhost:5000/api/health
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user | Private |
| POST | `/api/auth/logout` | User logout | Private |
| PUT | `/api/auth/profile` | Update user profile | Private |
| PUT | `/api/auth/password` | Update password | Private |

### Business Endpoints

#### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer (soft delete)

#### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get single job
- `POST /api/jobs` - Create job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `POST /api/jobs/:id/update-status` - Update job status
- `POST /api/jobs/:id/assign` - Assign job to operator
- `POST /api/jobs/:id/update-flow-stage` - Update job flow stage

#### Walk-in Jobs
- `GET /api/walk-in-jobs` - Get all walk-in jobs
- `POST /api/walk-in-jobs` - Create walk-in job

#### Invoices & Payments
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Record payment

#### Management Modules
- `GET/POST /api/inventory` - Inventory management
- `GET/POST /api/vendors` - Vendor management
- `GET/POST /api/staff` - Staff management
- `GET/POST /api/deliveries` - Delivery tracking
- `GET/POST /api/accounts` - Accounting
- `GET/POST /api/costs` - Cost tracking
- `GET/POST /api/proofs` - Proof management

#### Communication & Reports
- `GET /api/whatsapp/stats` - WhatsApp statistics
- `POST /api/whatsapp/send` - Send WhatsApp message
- `GET /api/reports/dashboard` - Dashboard analytics
- `GET /api/reports/revenue` - Revenue reports
- `POST /api/files/upload` - File upload

### Authentication

All protected routes require a JWT token in the Authorization header:

```javascript
// Frontend API call example
const token = localStorage.getItem('token');
fetch('/api/jobs', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Response Format

All API responses follow this format:

**Success Response**:
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    "result": "..."
  }
}
```

**Error Response**:
```json
{
  "status": "error",
  "message": "Error description",
  "errors": ["Specific validation errors"]
}
```

## Database Schema

### Key Models

- **User**: Authentication and user management
- **Customer**: Customer relationship management
- **Job**: Main job/work order entity
- **Invoice**: Billing and invoicing
- **Payment**: Payment tracking
- **Inventory**: Stock management
- **Staff**: Employee management
- **Vendor**: Supplier management

### Relationships

- Users own all their business data (multi-tenancy)
- Jobs link to Customers
- Invoices link to Jobs
- Payments link to Invoices/Customers
- Flow tracking maintains job journey history

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/print_arts_flow |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | Token expiration time | 24h |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | 12 |

### Optional Integrations

| Variable | Description |
|----------|-------------|
| `EMAIL_HOST` | SMTP host for emails |
| `CLOUDINARY_CLOUD_NAME` | File upload service |
| `WHATSAPP_API_KEY` | WhatsApp Business API |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Data Sanitization**: Protection against NoSQL injection and XSS
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with configurable rounds
- **Input Validation**: Express-validator for request validation

## Development

### Scripts

```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm test            # Run tests
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
```

### Project Structure

```
backend/
├── src/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   └── server.js        # Main server file
├── package.json         # Dependencies and scripts
├── env.example         # Environment template
└── README.md           # This file
```

### Adding New Features

1. **Create Model**: Define MongoDB schema in `/src/models/`
2. **Create Routes**: Define API endpoints in `/src/routes/`
3. **Add Middleware**: Implement custom middleware if needed
4. **Register Routes**: Add route registration in `server.js`
5. **Test**: Use tools like Postman or curl to test endpoints

## Production Deployment

### Recommended Stack

- **Hosting**: DigitalOcean, AWS, Heroku, or similar
- **Database**: MongoDB Atlas (cloud) or self-hosted MongoDB
- **Process Manager**: PM2 for Node.js process management
- **Reverse Proxy**: Nginx for load balancing and SSL termination
- **Monitoring**: Application monitoring and logging

### Performance Considerations

- **Database Indexing**: Ensure proper indexes on frequently queried fields
- **Caching**: Consider Redis for session storage and caching
- **CDN**: Use CDN for static files and images
- **Monitoring**: Implement APM tools for performance monitoring

## Migration from Supabase

This backend replaces the Supabase integration with:

- **Database**: PostgreSQL → MongoDB
- **Authentication**: Supabase Auth → JWT + Express middleware
- **Storage**: Supabase Storage → Cloudinary (configurable)
- **Functions**: Supabase Edge Functions → Express routes + Cron jobs
- **Real-time**: Supabase subscriptions → WebSocket (future enhancement)

### Migration Steps

1. **Setup Backend**: Follow installation instructions above
2. **Update Frontend**: Replace Supabase client calls with Axios fetch calls
3. **Environment**: Configure new database connection
4. **Testing**: Thoroughly test all functionalities
5. **Deployment**: Deploy both frontend and backend

## Support

For issues and questions:
- Check API health endpoint first: `GET /api/health`
- Review logs for detailed error information
- Ensure MongoDB is running and accessible
- Verify environment variables are correctly set
