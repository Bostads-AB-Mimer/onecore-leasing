# Introduction

Microservice for tenants and leases in ONECore.

## Installation

1. Make a copy of .env.template, call it .env
2. Fill out values in .env. (see below)
3. Install nvm
4. Install required version of node: `nvm install`
5. Use required version of node `nvm use`
6. Install packages: `npm run install`
7. Start database engine (SQL Server): `docker compose up -d &`
8. Create a database called `tenants-leases`
9. Create database structure: `npm run migrate:up`
10. Create test data: `npm run seed`

## Development

Start the development server: `npm run dev`

## Testing

The test suite requires a dedicated database for our database unit tests to run.
For local development, create a new MSSQL database and make a copy of `.env.test.template` called `.env.test` and supply
the credentials to your test database.

## Env

According to .env.template.
