You are a senior software architect, full-stack engineer, database architect, UI/UX engineer, QA engineer, and DevOps engineer.

Your task is to BUILD the complete production-ready Travel Agency + Hotel Booking Management System from scratch.

IMPORTANT:
Do not only explain the architecture.
Do not give me code snippets and ask me to implement them.
Actually CREATE the complete project, files, code, database migrations, Docker configuration, tests, documentation, and CI/CD configuration.

Work systematically through the entire project and make sure the application is runnable.

==================================================
1. PROJECT OVERVIEW
==================================================

Build a modern Travel Agency + Hotel Booking Management System.

The system should support:

- Travel agency management
- Hotel management
- Room management
- Room availability
- Hotel booking
- Customer management
- Guest management
- Tour/package management
- Destination management
- Transport management
- Payment management
- Invoice management
- Commission management
- Staff/agent management
- Role-based access control
- Reports
- Notifications
- Admin dashboard
- Customer-facing booking interface

The architecture must be scalable and suitable for production.

==================================================
2. TECHNOLOGY STACK
==================================================

Backend:

- Node.js current stable LTS version
- Express.js
- JavaScript only
- NO TypeScript
- ES Modules
- PostgreSQL
- Redis where useful
- REST API
- JWT authentication
- bcrypt/secure password hashing
- Prisma ORM OR Sequelize/Knex with migrations

Choose ONE database ORM/query layer and use it consistently.

Frontend:

- Latest stable React.js
- Vite
- JavaScript only
- NO TypeScript
- React Router
- Axios
- Modern component architecture

Database:

- PostgreSQL

Infrastructure:

- Docker
- Docker Compose
- GitHub Actions
- AWS ECR
- AWS ECS/Fargate
- AWS Application Load Balancer
- AWS RDS PostgreSQL
- AWS CloudWatch
- AWS Route 53 ready
- AWS S3 ready for file storage

Testing:

- Backend unit/integration tests
- Frontend tests
- API tests
- Critical booking workflow tests

==================================================
3. STRICT FOLDER STRUCTURE
==================================================

The project MUST have only these main application folders:

/
├── Backend/
├── Frontend/
├── .github/
│   └── workflows/
├── docker-compose.yml
├── .gitignore
├── README.md
└── documentation/

Do NOT create separate top-level folders such as:

database/
server/
client/
api/
infra/
deployment/
devops/

Backend must contain all backend-related code.

Frontend must contain all frontend-related code.

Infrastructure configuration should remain at root or `.github`.

==================================================
4. BACKEND ARCHITECTURE
==================================================

Use:

Backend/

src/
├── config/
├── controllers/
├── middleware/
├── models/
├── repositories/
├── routes/
├── services/
├── validators/
├── utils/
├── jobs/
├── integrations/
├── notifications/
├── app.js
└── server.js

Also include:

migrations/
seeds/
tests/

Architecture:

Route
 ↓
Middleware
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Database

Business logic MUST NOT be placed directly inside controllers.

Use:

- centralized error handling
- validation
- authentication middleware
- authorization middleware
- request logging
- rate limiting
- CORS
- Helmet/security headers
- graceful shutdown
- PostgreSQL connection pooling
- structured logging

==================================================
5. FRONTEND ARCHITECTURE
==================================================

Use:

Frontend/

src/
├── components/
├── layouts/
├── pages/
├── features/
├── routes/
├── services/
├── hooks/
├── contexts/
├── utils/
├── constants/
├── assets/
├── styles/
├── App.jsx
└── main.jsx

Use feature-based organization where appropriate.

Create reusable:

- buttons
- inputs
- modals
- tables
- pagination
- date pickers
- search filters
- status badges
- cards
- dialogs
- loaders
- notifications
- confirmation dialogs

The UI should be responsive for:

- Desktop
- Tablet
- Mobile

==================================================
6. USER ROLES
==================================================

Implement RBAC.

Roles:

1. Super Admin
2. Agency Admin
3. Hotel Admin
4. Booking Agent
5. Accountant
6. Tour Manager
7. Customer

Permissions should be granular.

Examples:

users.view
users.create
users.update
users.delete

hotels.view
hotels.create
hotels.update
hotels.delete

rooms.view
rooms.create
rooms.update
rooms.delete

bookings.view
bookings.create
bookings.update
bookings.cancel
bookings.confirm

payments.view
payments.create
payments.refund

reports.view

etc.

Users can have roles.

Roles can have permissions.

==================================================
7. AUTHENTICATION
==================================================

Implement:

- Login
- Logout
- Register
- Forgot password
- Reset password
- Change password
- Email verification
- Refresh token
- JWT authentication
- Role-based authorization
- Session/token management

Do not store passwords in plain text.

Implement secure password hashing.

Protect private API endpoints.

Frontend should have protected routes.

==================================================
8. HOTEL MANAGEMENT
==================================================

Create complete hotel management.

Hotels:

- name
- description
- address
- city
- state/province
- country
- postal code
- latitude
- longitude
- star rating
- contact information
- email
- phone
- check-in time
- check-out time
- status

Hotel statuses:

- active
- inactive
- suspended

Hotel features:

- amenities
- photos
- policies
- cancellation policy
- payment policy
- child policy
- pet policy

==================================================
9. ROOM MANAGEMENT
==================================================

Room Types:

- Standard
- Deluxe
- Superior
- Suite
- Family
- Villa
- Custom

Room type fields:

- name
- description
- max adults
- max children
- bed type
- room size
- smoking/non-smoking
- number of rooms

Individual rooms:

- room number
- floor
- room type
- status

Room statuses:

- available
- occupied
- maintenance
- inactive

Support multiple rooms under the same room type.

==================================================
10. HOTEL AMENITIES
==================================================

Create amenities.

Examples:

- WiFi
- Parking
- Swimming Pool
- Gym
- Restaurant
- Air Conditioning
- Breakfast
- Airport Transfer
- Room Service
- Spa

Support:

Hotel amenities
Room type amenities

==================================================
11. HOTEL PRICING
==================================================

Implement flexible pricing.

Rate plans:

- Room Only
- Breakfast Included
- Half Board
- Full Board
- All Inclusive

Rate configuration:

- room type
- rate plan
- start date
- end date
- price
- extra adult price
- extra child price
- currency

Support:

- seasonal pricing
- weekend pricing
- special pricing
- promotional pricing

Design the system so pricing rules can be extended later.

==================================================
12. HOTEL SEARCH
==================================================

Create customer hotel search.

Filters:

- destination
- check-in
- check-out
- adults
- children
- rooms
- price range
- star rating
- amenities
- room type

Search results should show:

- hotel
- rating
- location
- room types
- available rooms
- price
- amenities
- cancellation policy

==================================================
13. ROOM AVAILABILITY
==================================================

This is a CRITICAL part of the system.

Prevent double booking.

A room cannot be booked if an existing confirmed/held booking overlaps.

Overlap logic:

existing_check_in < requested_check_out
AND
existing_check_out > requested_check_in

Handle:

- pending
- held
- confirmed
- checked-in
- checked-out
- cancelled
- no-show

Cancelled bookings should release availability.

Use database transactions.

Use appropriate PostgreSQL constraints/indexes.

Where appropriate, use PostgreSQL locking or transaction isolation to prevent race conditions.

==================================================
14. TEMPORARY ROOM HOLD
==================================================

When customer starts checkout:

Room should be temporarily held.

Example:

Room 101
Status: HELD
Hold expires after 10 minutes.

If payment succeeds:

HELD → CONFIRMED

If payment fails or expires:

HELD → AVAILABLE

Use Redis for temporary holds if appropriate.

The system MUST protect against two users attempting to book the same room simultaneously.

==================================================
15. BOOKING SYSTEM
==================================================

Booking should support:

- customer
- multiple guests
- multiple rooms
- multiple room types
- check-in
- check-out
- adults
- children
- special requests
- extra services
- discount
- tax
- commission
- total
- paid
- due
- currency
- booking source

Booking sources:

- Website
- Mobile App
- Admin
- Agent
- Walk-in
- API

Booking statuses:

- pending
- held
- confirmed
- checked_in
- checked_out
- cancelled
- completed
- no_show

Generate unique booking number.

Example:

BK-2026-000001

==================================================
16. GUEST MANAGEMENT
==================================================

Support multiple guests per booking.

Guest fields:

- first name
- last name
- email
- phone
- date of birth
- nationality
- passport number
- passport expiry
- address
- special requirements

Support primary guest.

==================================================
17. BOOKING MODIFICATION
==================================================

Admin/authorized users should be able to:

- change dates
- change rooms
- add/remove rooms
- add guests
- change guest information
- apply discount
- modify payment

Every important modification should create booking history.

==================================================
18. BOOKING CANCELLATION
==================================================

Implement cancellation policies.

Examples:

Free cancellation before 7 days.

50% charge before 3 days.

100% charge within 24 hours.

Cancellation should calculate:

- cancellation fee
- refundable amount
- refund status

Store cancellation history.

==================================================
19. CHECK-IN / CHECK-OUT
==================================================

Hotel staff can:

Check-in guest.

Check-out guest.

Track:

- actual check-in
- actual check-out
- staff
- notes

Room status should update automatically.

Example:

Confirmed
→ Checked In
→ Checked Out

==================================================
20. EXTRA SERVICES
==================================================

Support additional services:

- Airport pickup
- Airport drop
- Breakfast
- Extra bed
- Laundry
- Room service
- Transportation
- Tours

Each service should have:

- name
- description
- price
- tax
- status

Services can be attached to bookings.

==================================================
21. CUSTOMER MANAGEMENT
==================================================

Customer profile:

- name
- email
- phone
- address
- nationality
- passport information
- booking history
- payment history

Customer dashboard:

- upcoming bookings
- past bookings
- cancelled bookings
- invoices
- profile

==================================================
22. TRAVEL AGENCY MODULE
==================================================

Implement travel agency features.

Destinations:

- name
- country
- description
- image
- status

Tour Packages:

- name
- destination
- description
- duration
- price
- max participants
- included services
- excluded services
- status

==================================================
23. TOUR ITINERARY
==================================================

Support day-by-day itinerary.

Example:

Day 1:
Dhaka → Cox's Bazar
Hotel check-in
Beach visit

Day 2:
Himchari
Inani Beach

Day 3:
Shopping
Return to Dhaka

Each itinerary:

- day number
- title
- description
- activities
- meals
- accommodation
- transportation

==================================================
24. TOUR BOOKING
==================================================

Customers can book tour packages.

Tour booking should support:

- customer
- participants
- package
- travel date
- price
- discount
- tax
- payment
- status

==================================================
25. TRANSPORT MANAGEMENT
==================================================

Vehicles:

- type
- registration number
- capacity
- driver
- status

Vehicle types:

- Car
- Microbus
- Bus
- Van
- Minibus

Transport booking:

- pickup
- drop-off
- date
- time
- vehicle
- driver
- price

==================================================
26. PAYMENT SYSTEM
==================================================

Payment records:

- booking
- transaction ID
- amount
- currency
- payment method
- payment gateway
- status
- paid date
- metadata

Methods:

- Cash
- Bank Transfer
- Card
- Mobile Banking
- Online Gateway

Statuses:

- pending
- processing
- paid
- failed
- refunded
- partially_refunded

Support:

- partial payment
- full payment
- refund
- partial refund

Do NOT hard-code a specific payment gateway.

Create a payment service abstraction so Stripe/PayPal/local Bangladesh payment gateways can be integrated later.

==================================================
27. INVOICE
==================================================

Generate invoices.

Invoice contains:

- company information
- customer
- booking number
- hotel
- rooms
- dates
- services
- subtotal
- discount
- tax
- total
- paid
- due
- payment status

Generate downloadable PDF invoices.

==================================================
28. COMMISSION
==================================================

Support agency/agent commission.

Example:

Booking:
$500

Agent commission:
10%

Commission:
$50

Track:

- agent
- booking
- percentage
- amount
- status
- paid date

==================================================
29. NOTIFICATIONS
==================================================

Create notification system.

Channels:

- Email
- In-app

Prepare architecture for:

- SMS
- WhatsApp

Events:

- booking created
- booking confirmed
- booking cancelled
- payment received
- payment failed
- check-in reminder
- check-out reminder
- password reset

Create notification service abstraction.

Do not hard-code an external provider.

==================================================
30. EMAIL
==================================================

Create email service.

Templates:

- welcome
- email verification
- password reset
- booking confirmation
- booking cancellation
- payment receipt
- invoice
- check-in reminder

Use environment configuration.

==================================================
31. ADMIN DASHBOARD
==================================================

Create a professional admin dashboard.

Dashboard cards:

- Total bookings
- Today's bookings
- Upcoming check-ins
- Upcoming check-outs
- Revenue
- Pending payments
- Available rooms
- Occupied rooms
- Customers
- Tour bookings

Charts:

- Revenue over time
- Booking trends
- Occupancy
- Top hotels
- Top destinations
- Payment methods

Recent bookings table.

==================================================
32. HOTEL ADMIN DASHBOARD
==================================================

Hotel admin should see:

- today's check-ins
- today's check-outs
- occupied rooms
- available rooms
- maintenance rooms
- upcoming bookings
- occupancy percentage

==================================================
33. BOOKING AGENT DASHBOARD
==================================================

Agent should see:

- bookings
- customers
- commissions
- upcoming trips
- pending payments

Agent permissions must be limited by RBAC.

==================================================
34. ACCOUNTING
==================================================

Implement basic financial reporting.

Reports:

- total revenue
- collected payment
- outstanding payment
- refunds
- commissions
- hotel revenue
- tour revenue
- monthly revenue
- daily revenue

Filters:

- date range
- hotel
- agent
- payment method
- booking source

==================================================
35. REPORTS
==================================================

Create reports for:

- bookings
- occupancy
- revenue
- customers
- payments
- refunds
- commissions
- hotels
- tours
- destinations

Allow CSV export.

PDF export where appropriate.

==================================================
36. AUDIT LOG
==================================================

Create audit logging.

Track:

- user
- action
- entity
- entity ID
- old value
- new value
- IP
- user agent
- timestamp

Examples:

Booking created
Booking modified
Payment created
Booking cancelled
User updated

==================================================
37. FILE UPLOAD
==================================================

Prepare file upload abstraction.

Potential files:

- hotel images
- room images
- customer documents
- passport documents
- invoices

Local development can use local storage.

Production should be S3-ready.

Never store uploaded files directly inside Git.

==================================================
38. FRONTEND ADMIN UI
==================================================

Create a professional modern admin interface.

Sidebar:

Dashboard
Bookings
Hotels
Rooms
Customers
Tours
Destinations
Transport
Payments
Invoices
Commissions
Reports
Users
Roles & Permissions
Settings

Use:

- responsive sidebar
- top navigation
- breadcrumbs
- tables
- filters
- search
- pagination
- modals
- forms
- validation
- loading states
- empty states
- error states
- confirmation dialogs

==================================================
39. CUSTOMER UI
==================================================

Create customer-facing pages:

Home
Hotels
Hotel Details
Search Results
Room Selection
Booking
Payment
Booking Confirmation
My Bookings
Booking Details
Invoices
Profile
Login
Register
Forgot Password

Design should be modern and responsive.

==================================================
40. HOTEL DETAILS PAGE
==================================================

Show:

- hotel images
- name
- rating
- address
- amenities
- policies
- available room types
- pricing
- cancellation policy

Allow selecting rooms.

==================================================
41. BOOKING CHECKOUT
==================================================

Checkout steps:

1. Guest Information
2. Room Summary
3. Additional Services
4. Price Summary
5. Payment
6. Confirmation

Price calculation must happen on the backend.

NEVER trust frontend-calculated totals.

Backend must recalculate:

- room price
- nights
- services
- discount
- tax
- commission
- final total

==================================================
42. SECURITY
==================================================

Implement:

- Helmet
- CORS
- rate limiting
- input validation
- SQL injection protection
- XSS protection
- CSRF consideration
- secure cookies where applicable
- JWT security
- password hashing
- authorization
- file upload validation
- request size limits

Never expose secrets.

Never log passwords or payment secrets.

==================================================
43. DATABASE DESIGN
==================================================

Create normalized PostgreSQL schema.

Expected major tables:

users
roles
permissions
user_roles
role_permissions

hotels
hotel_images
amenities
hotel_amenities

room_types
room_type_images
room_type_amenities
rooms

rate_plans
room_rates

customers
customer_documents

bookings
booking_rooms
booking_guests
booking_services
booking_status_history

services

payments
refunds

invoices
invoice_items

destinations
tour_packages
tour_images
tour_itineraries
tour_bookings

vehicles
drivers
transport_bookings

commissions

notifications
email_logs

audit_logs

settings

Use proper:

- primary keys
- foreign keys
- unique constraints
- indexes
- timestamps
- soft deletion where appropriate

==================================================
44. DATABASE MIGRATIONS
==================================================

Use migrations.

Never require manually editing the production database.

Provide commands for:

migration create
migration run
migration rollback
seed database

Create development seed data:

- admin user
- agency
- sample hotels
- room types
- rooms
- amenities
- rates
- sample customers
- sample bookings

Document seed credentials safely in README using development-only credentials.

==================================================
45. BOOKING TRANSACTION SAFETY
==================================================

This is critical.

Booking creation should use database transactions.

Flow:

1. Validate dates
2. Validate room
3. Check availability
4. Lock/check required records
5. Calculate price
6. Create booking
7. Create booking rooms
8. Create guests
9. Create payment intent/record
10. Commit

If anything fails:

ROLLBACK.

Prevent race conditions and double booking.

Write automated tests specifically for concurrent booking attempts.

==================================================
46. API DESIGN
==================================================

Use RESTful API.

Prefix:

/api/v1

Examples:

GET /api/v1/hotels
GET /api/v1/hotels/:id
POST /api/v1/hotels
PUT /api/v1/hotels/:id
DELETE /api/v1/hotels/:id

GET /api/v1/bookings
POST /api/v1/bookings
GET /api/v1/bookings/:id
PUT /api/v1/bookings/:id
POST /api/v1/bookings/:id/cancel

GET /api/v1/customers
POST /api/v1/customers

GET /api/v1/rooms/availability

GET /api/v1/dashboard

Use consistent response format:

{
  "success": true,
  "data": {},
  "message": "..."
}

Errors:

{
  "success": false,
  "message": "...",
  "errors": []
}

==================================================
47. API DOCUMENTATION
==================================================

Create OpenAPI/Swagger documentation.

Document:

- authentication
- hotels
- rooms
- availability
- bookings
- customers
- payments
- invoices
- tours
- reports

Expose Swagger in development.

==================================================
48. DOCKER
==================================================

The entire application must run with Docker.

Create:

docker-compose.yml

Services:

frontend
backend
postgres
redis

Use:

- health checks
- persistent PostgreSQL volume
- environment variables
- internal Docker network
- production-ready Dockerfiles
- multi-stage builds

Local startup:

docker compose up --build

Local shutdown:

docker compose down

==================================================
49. DEVELOPMENT ENVIRONMENT
==================================================

Support hot reload in development.

Frontend:

Vite development server.

Backend:

Node development server with automatic reload.

Do not use host-installed PostgreSQL.

==================================================
50. PRODUCTION DOCKER
==================================================

Create production-optimized images.

Frontend:

Build React application and serve using a production web server.

Backend:

Run Node.js production process.

Use non-root users where practical.

Keep images small.

==================================================
51. AWS ARCHITECTURE
==================================================

Design production deployment for:

AWS ECR
AWS ECS/Fargate
AWS ALB
AWS RDS PostgreSQL
AWS ElastiCache Redis
AWS S3
AWS CloudWatch
AWS Route 53

Architecture:

Internet
 ↓
Route 53
 ↓
ALB
 ↓
Frontend ECS Service
 ↓
Backend ECS Service
 ↓
RDS PostgreSQL
 ↓
ElastiCache Redis

S3 for uploaded files.

CloudWatch for logs.

==================================================
52. GITHUB ACTIONS
==================================================

Create:

.github/workflows/ci.yml
.github/workflows/deploy.yml

CI:

1. checkout
2. setup Node
3. install dependencies
4. lint backend
5. lint frontend
6. backend tests
7. frontend tests
8. build frontend
9. build backend

Deployment:

1. checkout
2. authenticate AWS using OIDC
3. login to ECR
4. build Backend Docker image
5. build Frontend Docker image
6. tag images with commit SHA
7. push to ECR
8. update ECS services
9. wait for deployment
10. run migrations safely
11. perform health check

Never use long-lived AWS credentials if OIDC is available.

==================================================
53. ENVIRONMENT MANAGEMENT
==================================================

Create:

Backend/.env.example
Frontend/.env.example

Backend:

NODE_ENV
PORT
DATABASE_URL
REDIS_URL
JWT_SECRET
JWT_REFRESH_SECRET
CORS_ORIGIN
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
AWS_REGION
AWS_S3_BUCKET

Frontend:

VITE_API_URL

Never commit real values.

==================================================
54. TESTING
==================================================

Backend tests:

- authentication
- authorization
- hotel CRUD
- room CRUD
- availability
- booking
- booking cancellation
- payment
- invoice
- concurrent booking
- permission checks

Frontend tests:

- login
- hotel search
- hotel details
- room selection
- checkout
- booking confirmation
- protected routes

At minimum, all critical booking functionality must have tests.

==================================================
55. ERROR HANDLING
==================================================

Implement:

- NotFoundError
- ValidationError
- AuthenticationError
- AuthorizationError
- ConflictError
- PaymentError
- DatabaseError

Central error middleware.

Never expose stack traces in production.

==================================================
56. LOGGING
==================================================

Use structured logging.

Log:

- request
- response
- errors
- booking events
- payment events
- authentication events

Do not log:

- passwords
- JWT tokens
- card details
- sensitive documents

==================================================
57. UI/UX REQUIREMENTS
==================================================

The UI should look like a professional SaaS application.

Use consistent:

- typography
- spacing
- forms
- buttons
- cards
- tables
- badges
- dialogs

Support:

- loading
- skeletons where appropriate
- empty states
- error states
- success notifications

Do not make the interface unnecessarily complicated.

Prioritize usability.

==================================================
58. SEARCH / FILTER / PAGINATION
==================================================

Admin tables should support:

- search
- filtering
- sorting
- pagination
- date range
- status

Backend APIs must support server-side pagination.

Example:

?page=1&limit=20&search=abc&status=confirmed

==================================================
59. SETTINGS
==================================================

Create settings for:

- agency name
- logo
- contact details
- currency
- timezone
- tax
- booking settings
- cancellation settings
- email settings
- notification settings

Do not hardcode business configuration.

==================================================
60. TIMEZONE
==================================================

Handle dates correctly.

Store timestamps in UTC.

Allow organization timezone configuration.

Display dates according to configured timezone.

Be careful with hotel check-in/check-out dates.

==================================================
61. CURRENCY
==================================================

Support currency configuration.

Store currency code with financial records.

Do not assume USD.

Allow future multi-currency support.

Never use floating point arithmetic for money where avoidable.

Use PostgreSQL NUMERIC/DECIMAL.

==================================================
62. AUDITABILITY
==================================================

Important business actions must be auditable.

Especially:

- booking creation
- booking modification
- booking cancellation
- payment
- refund
- user changes
- permission changes

==================================================
63. DOCUMENTATION
==================================================

Create:

README.md

documentation/

Include:

architecture.md
database.md
api.md
deployment.md
booking-flow.md
development.md

Document important decisions.

==================================================
64. INITIAL SEED DATA
==================================================

Create realistic demo data.

Example:

Agency:
Global Travel Agency

Hotels:
Grand Palace Hotel
Ocean View Resort
City Center Hotel

Room Types:
Standard
Deluxe
Suite

Amenities:
WiFi
Parking
Pool
Gym
Breakfast

Destinations:
Dhaka
Cox's Bazar
Chittagong
Sylhet
Sajek

Tour Packages:
Cox's Bazar 3 Days
Sylhet 2 Days
Sajek 3 Days

==================================================
65. ADMIN CREDENTIALS
==================================================

Create a development seed admin.

Example:

Email:
admin@example.com

Password:
Admin@12345

IMPORTANT:

Clearly mark this as DEVELOPMENT ONLY.

Never use this credential in production.

==================================================
66. HEALTH CHECK
==================================================

Backend:

GET /api/v1/health

Response:

{
  "success": true,
  "message": "API is healthy"
}

Database:

GET /api/v1/health/db

Redis:

GET /api/v1/health/redis

==================================================
67. IMPLEMENTATION ORDER
==================================================

Build in this order:

PHASE 1:
Project setup
Docker
Database
Backend
Frontend
Authentication

PHASE 2:
Users
Roles
Permissions

PHASE 3:
Hotels
Room types
Rooms
Amenities
Rates

PHASE 4:
Hotel search
Availability
Booking
Temporary holds

PHASE 5:
Customers
Guests
Booking modification
Cancellation
Check-in/check-out

PHASE 6:
Payments
Refunds
Invoices

PHASE 7:
Tours
Destinations
Transport

PHASE 8:
Commission
Reports
Accounting

PHASE 9:
Notifications
Email
File uploads

PHASE 10:
Admin dashboard
Customer portal

PHASE 11:
Testing
Security
Performance

PHASE 12:
Docker production
GitHub Actions
AWS deployment

Do not skip critical phases.

==================================================
68. IMPORTANT DEVELOPMENT RULES
==================================================

DO:

- Write production-quality code.
- Keep functions focused.
- Use reusable services.
- Use transactions.
- Validate all input.
- Validate authorization.
- Use migrations.
- Write tests.
- Keep secrets out of source code.
- Document important decisions.
- Handle edge cases.

DO NOT:

- Use TypeScript.
- Hardcode passwords.
- Hardcode API URLs.
- Trust frontend pricing.
- Trust frontend permissions.
- Allow double booking.
- Put business logic in controllers.
- Commit .env files.
- Store card details.
- Use floating point for money calculations.
- Create unnecessary abstractions.
- Add unnecessary dependencies.

==================================================
69. FINAL PROJECT REQUIREMENT
==================================================

At the end, the repository should look approximately like:

/
├── Backend/
│   ├── src/
│   ├── migrations/
│   ├── seeds/
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── Frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── documentation/
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── booking-flow.md
│   ├── development.md
│   └── deployment.md
│
├── docker-compose.yml
├── .gitignore
└── README.md

==================================================
70. FINAL VERIFICATION
==================================================

Before declaring the project complete, actually verify:

1. Docker builds.
2. PostgreSQL starts.
3. Redis starts.
4. Backend starts.
5. Frontend starts.
6. Backend connects to PostgreSQL.
7. Backend connects to Redis.
8. Health endpoints work.
9. Database migrations work.
10. Seed data works.
11. Login works.
12. RBAC works.
13. Hotel CRUD works.
14. Room CRUD works.
15. Hotel search works.
16. Availability works.
17. Booking works.
18. Double booking is prevented.
19. Cancellation works.
20. Payment records work.
21. Invoice generation works.
22. Tour management works.
23. Admin dashboard works.
24. Customer dashboard works.
25. Tests pass.
26. ESLint passes.
27. Frontend builds.
28. Docker production builds work.
29. GitHub Actions YAML is valid.
30. AWS deployment configuration is documented.

If something fails during implementation, FIX IT instead of simply documenting the failure.

==================================================
71. IMPORTANT: WORK AUTONOMOUSLY
==================================================

Do not stop after creating the skeleton.

Do not ask me to create individual files.

Do not ask me to write database migrations.

Do not ask me to implement missing modules.

Do not provide pseudo-code where real implementation is possible.

Make reasonable engineering decisions yourself.

If a library/API has changed, use the current stable/recommended approach.

If a feature requires an external provider such as payment, email, SMS, WhatsApp, or AWS, create a clean provider abstraction and a development implementation/mock so the system remains runnable locally.

Prioritize a working system over unnecessary complexity.

==================================================
FINAL INSTRUCTION
==================================================

START BUILDING THE PROJECT NOW.

Create the files and implementation directly.

After implementation, run the available tests/build/lint/Docker checks.

Fix errors you encounter.

At the end, provide a concise summary containing:

- What was implemented
- Important architecture decisions
- How to run locally
- Default development credentials
- Main API URL
- Main frontend URL
- Docker commands
- Test commands
- AWS deployment overview
- Any remaining limitations

DO NOT merely give me a tutorial.

BUILD THE COMPLETE PROJECT.