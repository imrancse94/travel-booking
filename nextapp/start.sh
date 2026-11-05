#!/bin/sh
# Production container start: migrate, optionally seed demo data, then serve.
set -e

node src/server/db/migrate.js

# Demo mode: load the demo data (hotels, rooms, demo accounts ...). The seed is
# idempotent -- every row is find-or-create -- so running it on every start is
# safe and a restart never duplicates anything. A seed failure is logged but
# does not stop the app from starting.
if [ "$IS_DEMO" = "true" ]; then
  echo "IS_DEMO=true: seeding demo data"
  node src/server/seeds/index.js || echo "WARNING: demo seed failed (continuing)"
fi

exec node server.js
