# Running SolanaPop with Docker

This guide will help you run the SolanaPop application using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Git clone of the SolanaPop repository

## Getting Started

1. Clone the repository (if you haven't already):
   ```bash
   git clone <repository-url>
   cd solanaPop
   ```

2. Make sure your `.env` file is set up correctly. You can copy the example:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file to add your configuration values.

3. Build and run the application with Docker Compose:
   ```bash
   docker-compose up -d
   ```

   This will:
   - Start a PostgreSQL database
   - Build and start the Node.js server
   - Build and start the client (web UI)

4. Access the application:
   - Web UI: http://localhost:3000
   - API: http://localhost:80

## Services

The Docker setup includes three services:

1. **postgres**: PostgreSQL database server
   - Port: 5432 (accessible on host)
   - User: postgres
   - Password: postgres
   - Database: solanapop_dev

2. **server**: Node.js backend API
   - Port: 80 (accessible on host)
   - Environment variables loaded from .env file

3. **client**: Web UI frontend
   - Port: 3000 (accessible on host)
   - Served with Nginx

## Common Commands

- Start all services:
  ```bash
  docker-compose up -d
  ```

- View logs:
  ```bash
  docker-compose logs -f
  ```

- Stop all services:
  ```bash
  docker-compose down
  ```

- Rebuild after changes:
  ```bash
  docker-compose up -d --build
  ```

- Access the database:
  ```bash
  docker-compose exec postgres psql -U postgres -d solanapop_dev
  ```

## Volume Data

The PostgreSQL data is persisted in a Docker volume named `postgres_data`. This ensures your data remains intact between container restarts.

## Development Mode

For development purposes, you might prefer to run some components locally while using Docker for others. For example, to only run the database in Docker:

```bash
docker-compose up -d postgres
```

Then run the server and client locally using:
```bash
pnpm dev
``` 