-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."BookingSource" AS ENUM('website', 'mobile_app', 'admin', 'agent', 'walk_in', 'api');--> statement-breakpoint
CREATE TYPE "public"."BookingStatus" AS ENUM('pending', 'held', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."CommissionStatus" AS ENUM('pending', 'approved', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."EntityStatus" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."HotelStatus" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."InvoiceStatus" AS ENUM('unpaid', 'partially_paid', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."NotificationChannel" AS ENUM('email', 'in_app', 'sms', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('cash', 'bank_transfer', 'card', 'mobile_banking', 'online_gateway');--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."RatePlanType" AS ENUM('room_only', 'breakfast_included', 'half_board', 'full_board', 'all_inclusive');--> statement-breakpoint
CREATE TYPE "public"."RefundStatus" AS ENUM('pending', 'processing', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."RoomStatus" AS ENUM('available', 'occupied', 'maintenance', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."TourBookingStatus" AS ENUM('pending', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."TransportBookingStatus" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."VehicleStatus" AS ENUM('available', 'in_use', 'maintenance', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."VehicleType" AS ENUM('car', 'microbus', 'bus', 'van', 'minibus');--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"to_email" text NOT NULL,
	"template" text NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"logo_url" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"status" "EntityStatus" DEFAULT 'active' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"email_verify_token" text,
	"email_verify_expires" timestamp(3),
	"password_reset_token" text,
	"password_reset_expires" timestamp(3),
	"refresh_token_hash" text,
	"status" "EntityStatus" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp(3),
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"module" text NOT NULL,
	"description" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text,
	"name" text NOT NULL,
	"description" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"star_rating" integer,
	"email" text,
	"phone" text,
	"check_in_time" text DEFAULT '14:00' NOT NULL,
	"check_out_time" text DEFAULT '12:00' NOT NULL,
	"cancellation_policy" text,
	"payment_policy" text,
	"child_policy" text,
	"pet_policy" text,
	"status" "HotelStatus" DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_images" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_amenities" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"amenity_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "amenities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"category" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_adults" integer DEFAULT 2 NOT NULL,
	"max_children" integer DEFAULT 0 NOT NULL,
	"bed_type" text,
	"room_size" numeric(6, 2),
	"smoking" boolean DEFAULT false NOT NULL,
	"total_rooms" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_type_images" (
	"id" text PRIMARY KEY NOT NULL,
	"room_type_id" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_type_amenities" (
	"id" text PRIMARY KEY NOT NULL,
	"room_type_id" text NOT NULL,
	"amenity_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"room_type_id" text NOT NULL,
	"room_number" text NOT NULL,
	"floor" text,
	"status" "RoomStatus" DEFAULT 'available' NOT NULL,
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"room_type_id" text NOT NULL,
	"rate_plan_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"extra_adult_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"extra_child_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "RatePlanType" DEFAULT 'room_only' NOT NULL,
	"description" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"nationality" text,
	"passport_number" text,
	"passport_expiry" date,
	"date_of_birth" date,
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"type" text NOT NULL,
	"file_url" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_number" text NOT NULL,
	"hotel_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"agent_id" text,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"adults" integer DEFAULT 1 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"special_requests" text,
	"status" "BookingStatus" DEFAULT 'pending' NOT NULL,
	"source" "BookingSource" DEFAULT 'website' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"commission_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"due_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"hold_expires_at" timestamp(3),
	"cancelled_at" timestamp(3),
	"cancellation_fee" numeric(12, 2),
	"refundable_amount" numeric(12, 2),
	"cancellation_reason" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"room_id" text NOT NULL,
	"room_type_id" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"nights" integer NOT NULL,
	"rate_per_night" numeric(12, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"actual_check_in" timestamp(3),
	"actual_check_out" timestamp(3),
	"checked_in_by_id" text,
	"checked_out_by_id" text,
	"notes" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_guests" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"date_of_birth" date,
	"nationality" text,
	"passport_number" text,
	"passport_expiry" date,
	"address" text,
	"special_requirements" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_services" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"service_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "EntityStatus" DEFAULT 'active' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"from_status" "BookingStatus",
	"to_status" "BookingStatus" NOT NULL,
	"changed_by_id" text,
	"reason" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"transaction_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"method" "PaymentMethod" NOT NULL,
	"gateway" text,
	"status" "PaymentStatus" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp(3),
	"metadata" jsonb,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text,
	"status" "RefundStatus" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"booking_id" text NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"due_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "InvoiceStatus" DEFAULT 'unpaid' NOT NULL,
	"pdf_url" text,
	"issued_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"description" text,
	"image_url" text,
	"status" "EntityStatus" DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"destination_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_days" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"max_participants" integer NOT NULL,
	"included_services" text,
	"excluded_services" text,
	"status" "EntityStatus" DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_images" (
	"id" text PRIMARY KEY NOT NULL,
	"tour_package_id" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_itineraries" (
	"id" text PRIMARY KEY NOT NULL,
	"tour_package_id" text NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"activities" text,
	"meals" text,
	"accommodation" text,
	"transportation" text
);
--> statement-breakpoint
CREATE TABLE "tour_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_number" text NOT NULL,
	"tour_package_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"participants" integer NOT NULL,
	"travel_date" date NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "TourBookingStatus" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "VehicleType" NOT NULL,
	"registration_number" text NOT NULL,
	"capacity" integer NOT NULL,
	"status" "VehicleStatus" DEFAULT 'available' NOT NULL,
	"deleted_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text,
	"name" text NOT NULL,
	"phone" text,
	"license_number" text,
	"status" "EntityStatus" DEFAULT 'active' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text,
	"vehicle_id" text NOT NULL,
	"driver_id" text,
	"pickup" text NOT NULL,
	"dropoff" text NOT NULL,
	"date" date NOT NULL,
	"time" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"status" "TransportBookingStatus" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "CommissionStatus" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp(3),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"channel" "NotificationChannel" DEFAULT 'in_app' NOT NULL,
	"event" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hotel_amenities" ADD CONSTRAINT "hotel_amenities_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hotel_amenities" ADD CONSTRAINT "hotel_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_type_images" ADD CONSTRAINT "room_type_images_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_checked_in_by_id_fkey" FOREIGN KEY ("checked_in_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_checked_out_by_id_fkey" FOREIGN KEY ("checked_out_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_packages" ADD CONSTRAINT "tour_packages_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_tour_package_id_fkey" FOREIGN KEY ("tour_package_id") REFERENCES "public"."tour_packages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_itineraries" ADD CONSTRAINT "tour_itineraries_tour_package_id_fkey" FOREIGN KEY ("tour_package_id") REFERENCES "public"."tour_packages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_tour_package_id_fkey" FOREIGN KEY ("tour_package_id") REFERENCES "public"."tour_packages"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles" USING btree ("user_id" text_ops,"role_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_key" ON "roles" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions" USING btree ("role_id" text_ops,"permission_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "hotels_city_country_idx" ON "hotels" USING btree ("city" text_ops,"country" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "hotel_amenities_hotel_id_amenity_id_key" ON "hotel_amenities" USING btree ("hotel_id" text_ops,"amenity_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "room_type_amenities_room_type_id_amenity_id_key" ON "room_type_amenities" USING btree ("room_type_id" text_ops,"amenity_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_room_type_id_room_number_key" ON "rooms" USING btree ("room_type_id" text_ops,"room_number" text_ops);--> statement-breakpoint
CREATE INDEX "room_rates_room_type_id_start_date_end_date_idx" ON "room_rates" USING btree ("room_type_id" date_ops,"start_date" text_ops,"end_date" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_key" ON "customers" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings" USING btree ("booking_number" text_ops);--> statement-breakpoint
CREATE INDEX "bookings_check_in_check_out_idx" ON "bookings" USING btree ("check_in" date_ops,"check_out" date_ops);--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "booking_rooms_room_id_check_in_check_out_idx" ON "booking_rooms" USING btree ("room_id" date_ops,"check_in" text_ops,"check_out" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices" USING btree ("invoice_number" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tour_itineraries_tour_package_id_day_number_key" ON "tour_itineraries" USING btree ("tour_package_id" int4_ops,"day_number" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tour_bookings_booking_number_key" ON "tour_bookings" USING btree ("booking_number" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles" USING btree ("registration_number" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs" USING btree ("entity" text_ops,"entity_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "settings_agency_id_key_key" ON "settings" USING btree ("agency_id" text_ops,"key" text_ops);
*/