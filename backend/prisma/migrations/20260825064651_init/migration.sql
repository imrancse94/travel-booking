-- CreateEnum
CREATE TYPE "HotelStatus" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('available', 'occupied', 'maintenance', 'inactive');

-- CreateEnum
CREATE TYPE "RatePlanType" AS ENUM ('room_only', 'breakfast_included', 'half_board', 'full_board', 'all_inclusive');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'held', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('website', 'mobile_app', 'admin', 'agent', 'walk_in', 'api');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank_transfer', 'card', 'mobile_banking', 'online_gateway');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'processing', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('unpaid', 'partially_paid', 'paid', 'void');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('pending', 'approved', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "TourBookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "TransportBookingStatus" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('car', 'microbus', 'bus', 'van', 'minibus');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('available', 'in_use', 'maintenance', 'inactive');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'in_app', 'sms', 'whatsapp');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "EntityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" TEXT,
    "email_verify_expires" TIMESTAMP(3),
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "refresh_token_hash" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "star_rating" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "check_in_time" TEXT NOT NULL DEFAULT '14:00',
    "check_out_time" TEXT NOT NULL DEFAULT '12:00',
    "cancellation_policy" TEXT,
    "payment_policy" TEXT,
    "child_policy" TEXT,
    "pet_policy" TEXT,
    "status" "HotelStatus" NOT NULL DEFAULT 'active',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_images" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_amenities" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,

    CONSTRAINT "hotel_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "max_adults" INTEGER NOT NULL DEFAULT 2,
    "max_children" INTEGER NOT NULL DEFAULT 0,
    "bed_type" TEXT,
    "room_size" DECIMAL(6,2),
    "smoking" BOOLEAN NOT NULL DEFAULT false,
    "total_rooms" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_images" (
    "id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_type_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_amenities" (
    "id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,

    CONSTRAINT "room_type_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "floor" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'available',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RatePlanType" NOT NULL DEFAULT 'room_only',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_rates" (
    "id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "rate_plan_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "extra_adult_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "extra_child_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "nationality" TEXT,
    "passport_number" TEXT,
    "passport_expiry" DATE,
    "date_of_birth" DATE,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_documents" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "EntityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "booking_number" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "special_requests" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "source" "BookingSource" NOT NULL DEFAULT 'website',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hold_expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_fee" DECIMAL(12,2),
    "refundable_amount" DECIMAL(12,2),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_rooms" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "rate_per_night" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "actual_check_in" TIMESTAMP(3),
    "actual_check_out" TIMESTAMP(3),
    "checked_in_by_id" TEXT,
    "checked_out_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "date_of_birth" DATE,
    "nationality" TEXT,
    "passport_number" TEXT,
    "passport_expiry" DATE,
    "address" TEXT,
    "special_requirements" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_services" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "changed_by_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "PaymentMethod" NOT NULL,
    "gateway" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'unpaid',
    "pdf_url" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'active',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_packages" (
    "id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_days" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "max_participants" INTEGER NOT NULL,
    "included_services" TEXT,
    "excluded_services" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'active',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_images" (
    "id" TEXT NOT NULL,
    "tour_package_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_itineraries" (
    "id" TEXT NOT NULL,
    "tour_package_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activities" TEXT,
    "meals" TEXT,
    "accommodation" TEXT,
    "transportation" TEXT,

    CONSTRAINT "tour_itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_bookings" (
    "id" TEXT NOT NULL,
    "booking_number" TEXT NOT NULL,
    "tour_package_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "participants" INTEGER NOT NULL,
    "travel_date" DATE NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TourBookingStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "registration_number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'available',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "license_number" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_bookings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "pickup" TEXT NOT NULL,
    "dropoff" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "TransportBookingStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "event" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "hotels_city_country_idx" ON "hotels"("city", "country");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_amenities_hotel_id_amenity_id_key" ON "hotel_amenities"("hotel_id", "amenity_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_type_amenities_room_type_id_amenity_id_key" ON "room_type_amenities"("room_type_id", "amenity_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_type_id_room_number_key" ON "rooms"("room_type_id", "room_number");

-- CreateIndex
CREATE INDEX "room_rates_room_type_id_start_date_end_date_idx" ON "room_rates"("room_type_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings"("booking_number");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_check_in_check_out_idx" ON "bookings"("check_in", "check_out");

-- CreateIndex
CREATE INDEX "booking_rooms_room_id_check_in_check_out_idx" ON "booking_rooms"("room_id", "check_in", "check_out");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "tour_itineraries_tour_package_id_day_number_key" ON "tour_itineraries"("tour_package_id", "day_number");

-- CreateIndex
CREATE UNIQUE INDEX "tour_bookings_booking_number_key" ON "tour_bookings"("booking_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_agency_id_key_key" ON "settings"("agency_id", "key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_amenities" ADD CONSTRAINT "hotel_amenities_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_amenities" ADD CONSTRAINT "hotel_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_images" ADD CONSTRAINT "room_type_images_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_checked_in_by_id_fkey" FOREIGN KEY ("checked_in_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_checked_out_by_id_fkey" FOREIGN KEY ("checked_out_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_packages" ADD CONSTRAINT "tour_packages_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_tour_package_id_fkey" FOREIGN KEY ("tour_package_id") REFERENCES "tour_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_itineraries" ADD CONSTRAINT "tour_itineraries_tour_package_id_fkey" FOREIGN KEY ("tour_package_id") REFERENCES "tour_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_tour_package_id_fkey" FOREIGN KEY ("tour_package_id") REFERENCES "tour_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
