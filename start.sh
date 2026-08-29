#!/bin/sh

# Generate Prisma Client
npx prisma generate

# Run pending migrations safely (never drops columns)
npx prisma migrate deploy

# Seed initial data inside the container so VPS deploys do not need a manual command
node dist/prisma/schema/seed.js

# Automatic Seed
pnpm seed

# Start the NestJS application
npm run start:prod