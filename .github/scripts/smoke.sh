#!/usr/bin/env bash
#
# End-to-end smoke test against a *running* stack (instructions.md section 70).
#
# Exercises the real HTTP surface -- health, auth, RBAC, availability, the
# booking lifecycle, double-booking prevention, payment, invoice PDF,
# cancellation, reports/exports -- and exits non-zero on the first failed
# expectation. Used by .github/workflows/docker-compose-ci.yml and by
# `make smoke` locally.
#
# Requires: curl, python3. Assumes the database has been seeded.
#
#   API_URL=http://localhost:4000/api/v1 WEB_URL=http://localhost:5173 ./smoke.sh
#
set -uo pipefail

API_URL="${API_URL:-http://localhost:4000/api/v1}"
WEB_URL="${WEB_URL:-http://localhost:5173}"
DOCS_URL="${DOCS_URL:-${API_URL%/api/v1}/api-docs/}"
MAIL_URL="${MAIL_URL:-http://localhost:8026}"
PGADMIN_URL="${PGADMIN_URL:-http://localhost:5050}"
# Dev-only seeded credentials (backend/seeds/index.js). Overridable so this can
# also be pointed at a throwaway environment with different demo accounts.
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@12345}"
CUSTOMER_EMAIL="${CUSTOMER_EMAIL:-customer@example.com}"
CUSTOMER_PASSWORD="${CUSTOMER_PASSWORD:-Customer@12345}"
# The bundled dev tools (Mailpit, pgAdmin) are part of docker-compose.yml but
# never of a real deployment: set CHECK_DEV_TOOLS=0 to skip them.
CHECK_DEV_TOOLS="${CHECK_DEV_TOOLS:-1}"

pass=0
fail=0

# --- helpers ---------------------------------------------------------------

# Read a dotted path out of a JSON body on stdin: `jget data.user.roles.0`
jget() {
  python3 -c '
import json, sys
try:
    value = json.load(sys.stdin)
except Exception:
    sys.exit(1)
for part in [p for p in sys.argv[1].split(".") if p]:
    try:
        value = value[int(part)] if part.isdigit() else value[part]
    except Exception:
        sys.exit(1)
if value is None:
    print("")
elif isinstance(value, bool):
    print(str(value).lower())
elif isinstance(value, (list, dict)):
    print(json.dumps(value))
else:
    print(value)
' "$1" 2>/dev/null
}

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
content_type() { curl -s -o /dev/null -w '%{content_type}' "$@"; }

check() { # check <name> <expected> <actual>
  if [ "$2" = "$3" ]; then
    echo "  ok    $1"
    pass=$((pass + 1))
  else
    echo "  FAIL  $1 -- expected '$2', got '$3'"
    fail=$((fail + 1))
  fi
}

group() { echo; echo "== $1"; }

days_from_today() { python3 -c "import datetime,sys;print((datetime.date.today()+datetime.timedelta(days=int(sys.argv[1]))).isoformat())" "$1"; }

post_json() { # post_json <url> <token-or-empty> <body>
  if [ -n "$2" ]; then
    curl -s -X POST "$1" -H 'Content-Type: application/json' -H "Authorization: Bearer $2" -d "$3"
  else
    curl -s -X POST "$1" -H 'Content-Type: application/json' -d "$3"
  fi
}

# Same call, returning the status code. Bodies are always built into a variable
# first: escaped JSON written inline inside "$( ... )" gets mangled by the
# surrounding quotes and reaches the API as an unparseable body (a 400).
post_status() { # post_status <url> <token-or-empty> <body>
  if [ -n "$2" ]; then
    curl -s -o /dev/null -w '%{http_code}' -X POST "$1" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $2" -d "$3"
  else
    curl -s -o /dev/null -w '%{http_code}' -X POST "$1" -H 'Content-Type: application/json' -d "$3"
  fi
}

auth_status() { curl -s -o /dev/null -w '%{http_code}' "$1" -H "Authorization: Bearer $2"; }

# --- health ----------------------------------------------------------------

group "Health and reachability"
check "GET /health"        200 "$(status "$API_URL/health")"
check "GET /health/db"     200 "$(status "$API_URL/health/db")"
check "GET /health/redis"  200 "$(status "$API_URL/health/redis")"
check "Swagger UI"         200 "$(status "$DOCS_URL")"
check "frontend served"    200 "$(status "$WEB_URL/")"
if [ "$CHECK_DEV_TOOLS" = "1" ]; then
  check "Mailpit UI"       200 "$(status "$MAIL_URL/")"
  check "pgAdmin UI"       302 "$(status "$PGADMIN_URL/")"
fi

# --- authentication --------------------------------------------------------

group "Authentication"
admin_login=$(post_json "$API_URL/auth/login" "" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
ADMIN_TOKEN=$(printf '%s' "$admin_login" | jget data.accessToken)
check "admin login succeeds"       "true"        "$(printf '%s' "$admin_login" | jget success)"
check "admin is Super Admin"       "Super Admin" "$(printf '%s' "$admin_login" | jget data.user.roles.0)"
check "admin access token issued"  "true"        "$([ -n "$ADMIN_TOKEN" ] && echo true || echo false)"

customer_login=$(post_json "$API_URL/auth/login" "" "{\"email\":\"$CUSTOMER_EMAIL\",\"password\":\"$CUSTOMER_PASSWORD\"}")
CUSTOMER_TOKEN=$(printf '%s' "$customer_login" | jget data.accessToken)
check "customer login succeeds"    "true" "$(printf '%s' "$customer_login" | jget success)"

wrong_password_body="{\"email\":\"$ADMIN_EMAIL\",\"password\":\"definitely-not-the-password\"}"
check "wrong password rejected" 401 "$(post_status "$API_URL/auth/login" "" "$wrong_password_body")"
check "GET /auth/me with token" 200 "$(auth_status "$API_URL/auth/me" "$ADMIN_TOKEN")"

# --- authorization ---------------------------------------------------------

group "RBAC"
check "no token -> 401"                  401 "$(status "$API_URL/users")"
check "garbage token -> 401"             401 "$(auth_status "$API_URL/users" "not-a-real-token")"
check "customer cannot list users"       403 "$(auth_status "$API_URL/users" "$CUSTOMER_TOKEN")"
check "customer cannot list roles"       403 "$(auth_status "$API_URL/roles" "$CUSTOMER_TOKEN")"
check "admin can list users"             200 "$(auth_status "$API_URL/users" "$ADMIN_TOKEN")"
check "admin can list roles"             200 "$(auth_status "$API_URL/roles" "$ADMIN_TOKEN")"

# --- catalogue -------------------------------------------------------------

group "Hotels, rooms and the public catalogue"
hotels=$(curl -s "$API_URL/hotels?page=1&limit=5" -H "Authorization: Bearer $ADMIN_TOKEN")
HOTEL_ID=$(printf '%s' "$hotels" | jget data.0.id)
hotel_total=$(printf '%s' "$hotels" | jget meta.pagination.total)
check "hotel list is populated" "true" "$(python3 -c "print(str(int('${hotel_total:-0}') >= 3).lower())")"
check "hotel detail is public"           200 "$(status "$API_URL/hotels/$HOTEL_ID")"
check "room types list"                  200 "$(auth_status "$API_URL/room-types?hotelId=$HOTEL_ID" "$ADMIN_TOKEN")"
check "rooms list"                       200 "$(auth_status "$API_URL/rooms" "$ADMIN_TOKEN")"
# Amenities are staff-only (amenities.routes.js mounts `authenticate`);
# customers see a hotel's amenities embedded in its public detail payload.
check "amenities require auth"           401 "$(status "$API_URL/amenities")"
check "amenities for staff"              200 "$(auth_status "$API_URL/amenities" "$ADMIN_TOKEN")"
check "extra-services catalogue public"  200 "$(status "$API_URL/services")"
check "destinations are public"          200 "$(status "$API_URL/destinations")"
check "tour packages are public"         200 "$(status "$API_URL/tours")"
# Unselected admin filters must not be sent as empty strings -- the query
# validators reject those, which is what makes a list page render empty.
check "empty enum filter is rejected"    422 "$(auth_status "$API_URL/hotels?page=1&limit=20&status=" "$ADMIN_TOKEN")"

# --- availability ----------------------------------------------------------

group "Availability search"
CHECK_IN=$(days_from_today 45)
CHECK_OUT=$(days_from_today 48)
avail_query="hotelId=$HOTEL_ID&checkIn=$CHECK_IN&checkOut=$CHECK_OUT&adults=2&children=0&rooms=1"
availability=$(curl -s "$API_URL/rooms/availability?$avail_query")
ROOM_TYPE_ID=$(printf '%s' "$availability" | jget data.0.roomTypes.0.id)
rooms_before=$(printf '%s' "$availability" | jget data.0.roomTypes.0.availableRooms)
rate_per_night=$(printf '%s' "$availability" | jget data.0.roomTypes.0.ratePerNight)
check "availability returns a room type" "true" "$([ -n "$ROOM_TYPE_ID" ] && echo true || echo false)"
check "rooms are available"              "true" "$(python3 -c "print(str(int('${rooms_before:-0}') > 0).lower())")"
check "room type is priced"              "true" "$([ -n "$rate_per_night" ] && echo true || echo false)"
check "checkOut before checkIn -> 422"   422 \
  "$(status "$API_URL/rooms/availability?hotelId=$HOTEL_ID&checkIn=$CHECK_OUT&checkOut=$CHECK_IN&adults=1")"

# read the availability count for ROOM_TYPE_ID out of a fresh search
availability_count() {
  curl -s "$API_URL/rooms/availability?$avail_query" | python3 -c "
import json, sys
data = json.load(sys.stdin).get('data') or []
for hotel in data:
    for rt in hotel.get('roomTypes') or []:
        if rt['id'] == sys.argv[1]:
            print(rt['availableRooms']); sys.exit(0)
print(0)
" "$ROOM_TYPE_ID"
}

# --- booking ---------------------------------------------------------------

group "Booking lifecycle"
booking=$(post_json "$API_URL/bookings" "$CUSTOMER_TOKEN" "{
  \"hotelId\": \"$HOTEL_ID\",
  \"checkIn\": \"$CHECK_IN\",
  \"checkOut\": \"$CHECK_OUT\",
  \"adults\": 2,
  \"children\": 0,
  \"source\": \"website\",
  \"rooms\": [{ \"roomTypeId\": \"$ROOM_TYPE_ID\" }],
  \"guests\": [{ \"firstName\": \"Smoke\", \"lastName\": \"Test\", \"isPrimary\": true }]
}")
BOOKING_ID=$(printf '%s' "$booking" | jget data.id)
BOOKING_NUMBER=$(printf '%s' "$booking" | jget data.bookingNumber)
BOOKING_TOTAL=$(printf '%s' "$booking" | jget data.totalAmount)
ROOM_ID=$(printf '%s' "$booking" | jget data.bookingRooms.0.roomId)

check "booking created"            "true" "$(printf '%s' "$booking" | jget success)"
check "booking number format"      "true" "$(python3 -c "import re;print(str(bool(re.fullmatch(r'BK-\d{4}-\d{6}', '$BOOKING_NUMBER'))).lower())")"
check "room auto-assigned"         "true" "$([ -n "$ROOM_ID" ] && echo true || echo false)"
check "server calculated a total"  "true" "$(python3 -c "print(str(float('${BOOKING_TOTAL:-0}') > 0).lower())")"
check "held room left availability" "$((rooms_before - 1))" "$(availability_count)"
check "customer can read own booking" 200 "$(auth_status "$API_URL/bookings/$BOOKING_ID" "$CUSTOMER_TOKEN")"

group "Double-booking prevention"
CUSTOMER_ID=$(curl -s "$API_URL/customers/me" -H "Authorization: Bearer $CUSTOMER_TOKEN" | jget data.id)
duplicate_body="{
  \"hotelId\": \"$HOTEL_ID\",
  \"customerId\": \"$CUSTOMER_ID\",
  \"checkIn\": \"$CHECK_IN\",
  \"checkOut\": \"$CHECK_OUT\",
  \"adults\": 1,
  \"children\": 0,
  \"source\": \"admin\",
  \"rooms\": [{ \"roomId\": \"$ROOM_ID\" }],
  \"guests\": [{ \"firstName\": \"Duplicate\", \"lastName\": \"Booking\", \"isPrimary\": true }]
}"
check "same room, overlapping dates -> 409" 409 "$(post_status "$API_URL/bookings" "$ADMIN_TOKEN" "$duplicate_body")"

# --- money -----------------------------------------------------------------

group "Payment and invoice"
payment=$(post_json "$API_URL/payments" "$CUSTOMER_TOKEN" "{
  \"bookingId\": \"$BOOKING_ID\",
  \"amount\": $BOOKING_TOTAL,
  \"method\": \"card\",
  \"gateway\": \"mock\"
}")
check "payment captured" "paid" "$(printf '%s' "$payment" | jget data.status)"

paid_booking=$(curl -s "$API_URL/bookings/$BOOKING_ID" -H "Authorization: Bearer $CUSTOMER_TOKEN")
check "booking confirmed by payment" "confirmed" "$(printf '%s' "$paid_booking" | jget data.status)"
check "balance cleared" "0" "$(python3 -c "print(int(float('$(printf '%s' "$paid_booking" | jget data.dueAmount)')))")"

invoice=$(post_json "$API_URL/invoices" "$ADMIN_TOKEN" "{\"bookingId\":\"$BOOKING_ID\"}")
INVOICE_ID=$(printf '%s' "$invoice" | jget data.id)
check "invoice generated" "true" "$([ -n "$INVOICE_ID" ] && echo true || echo false)"
check "invoice listable by booking" 200 "$(auth_status "$API_URL/invoices?bookingId=$BOOKING_ID" "$ADMIN_TOKEN")"
check "invoice renders as PDF" "application/pdf" \
  "$(curl -s -o /dev/null -w '%{content_type}' "$API_URL/invoices/$INVOICE_ID/pdf" -H "Authorization: Bearer $ADMIN_TOKEN")"

group "Cancellation"
cancellation=$(post_json "$API_URL/bookings/$BOOKING_ID/cancel" "$CUSTOMER_TOKEN" '{"reason":"smoke test"}')
check "cancel response reports cancelled" "cancelled" "$(printf '%s' "$cancellation" | jget data.status)"
check "cancelledAt recorded" "true" \
  "$([ -n "$(printf '%s' "$cancellation" | jget data.cancelledAt)" ] && echo true || echo false)"
check "cancellation released the room" "$rooms_before" "$(availability_count)"
check "cancelling twice -> 409" 409 \
  "$(post_status "$API_URL/bookings/$BOOKING_ID/cancel" "$CUSTOMER_TOKEN" '{"reason":"again"}')"

# --- reporting -------------------------------------------------------------

group "Dashboard, reports and settings"
check "dashboard"              200 "$(auth_status "$API_URL/dashboard" "$ADMIN_TOKEN")"
check "commissions"            200 "$(auth_status "$API_URL/commissions" "$ADMIN_TOKEN")"
check "bookings report"        200 "$(auth_status "$API_URL/reports/bookings" "$ADMIN_TOKEN")"
check "revenue report"         200 "$(auth_status "$API_URL/reports/revenue" "$ADMIN_TOKEN")"
check "occupancy report"       200 "$(auth_status "$API_URL/reports/occupancy" "$ADMIN_TOKEN")"
check "audit log"              200 "$(auth_status "$API_URL/reports/audit-logs" "$ADMIN_TOKEN")"
csv_type=$(content_type "$API_URL/reports/bookings/export" -H "Authorization: Bearer $ADMIN_TOKEN")
check "CSV export" "true" "$(python3 -c "print(str('csv' in '''$csv_type''').lower())")"
check "settings"               200 "$(auth_status "$API_URL/settings" "$ADMIN_TOKEN")"
check "notifications"          200 "$(auth_status "$API_URL/notifications" "$CUSTOMER_TOKEN")"
check "vehicles"               200 "$(auth_status "$API_URL/transport/vehicles" "$ADMIN_TOKEN")"

# --- result ----------------------------------------------------------------

echo
echo "-----------------------------------------"
echo "  passed: $pass    failed: $fail"
echo "-----------------------------------------"
[ "$fail" -eq 0 ]
