# Solana POP - Technical Architecture

This document outlines the technical architecture of the Solana Proof-of-Participation (POP) platform, including current implementation details and design decisions.

## Table of Contents

1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Design](#database-design)
5. [Blockchain Integration](#blockchain-integration)
6. [Security Considerations](#security-considerations)
7. [API Documentation](#api-documentation)
8. [Deployment Architecture](#deployment-architecture)

---

## System Overview

The Solana POP platform is a full-stack web application built with modern JavaScript/TypeScript technologies. It follows a client-server architecture with React on the frontend and Express.js on the backend, connected to a PostgreSQL database for persistent storage.

### Technology Stack

**Frontend:**
- React (with TypeScript)
- TailwindCSS for styling
- ShadCN UI component library
- TanStack Query for data fetching
- Wouter for routing

**Backend:**
- Express.js (Node.js)
- Drizzle ORM for database operations
- Zod for schema validation

**Database:**
- PostgreSQL via Neon serverless

**Blockchain:**
- Solana Web3.js SDK (planned implementation)
- Solana SPL Token (planned implementation)

### System Architecture Diagram

```
┌───────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│    Client Side    │        │   Server Side    │        │    Data Layer   │
│                   │        │                  │        │                 │
│  ┌─────────────┐  │        │  ┌────────────┐  │        │  ┌───────────┐  │
│  │    React    │  │        │  │  Express   │  │        │  │PostgreSQL │  │
│  │  Components │◄─┼────────┼──┤   Routes   │◄─┼────────┼──┤  Database │  │
│  └─────────────┘  │        │  └────────────┘  │        │  └───────────┘  │
│         ▲         │        │        ▲         │        │                 │
│         │         │        │        │         │        │                 │
│  ┌─────────────┐  │        │  ┌────────────┐  │        │  ┌───────────┐  │
│  │  TanStack   │  │   REST │  │  Storage   │  │        │  │  Solana   │  │
│  │   Query     │◄─┼────────┼──┤  Service   │◄─┼────────┼──┤ Blockchain│  │
│  └─────────────┘  │   API  │  └────────────┘  │        │  └───────────┘  │
│         ▲         │        │        ▲         │        │     (Future)    │
│         │         │        │        │         │        │                 │
│  ┌─────────────┐  │        │  ┌────────────┐  │        │                 │
│  │   Wallet    │  │        │  │ Validation │  │        │                 │
│  │ Integration │  │        │  │  Service   │  │        │                 │
│  └─────────────┘  │        │  └────────────┘  │        │                 │
└───────────────────┘        └──────────────────┘        └─────────────────┘
```

---

## Frontend Architecture

### Component Structure

The frontend follows a component-based architecture with the following key components:

1. **App Component**: Root component that sets up routing and global providers.
2. **Home Page**: Landing page with options to select creator or attendee roles.
3. **CreatorView Component**: Interface for event creators to create and manage tokens.
4. **AttendeeView Component**: Interface for event attendees to scan QR codes and view their token collection.
5. **QRCodeModal Component**: Modal for displaying and sharing QR codes.
6. **TransactionModal Component**: Modal for displaying transaction success information.
7. **WalletProvider Component**: Context provider for Solana wallet integration.

### State Management

- **Local State**: Managed using React's `useState` and `useEffect` hooks for component-specific state.
- **API Data**: Managed using TanStack Query for server-side data fetching, caching, and updates.
- **Wallet State**: Managed through a context provider (`WalletProvider`) to make wallet information available globally.

### Styling

- **Tailwind CSS**: Used for utility-based styling with custom theme configuration.
- **ShadCN UI**: Provides accessible, customizable UI components.
- **Custom Theme**: Uses Solana's brand colors (green/purple) and dark mode with glass-morphism effects.

### Routing

- **Wouter**: Lightweight routing library used for navigation between pages.
- Current routes:
  - `/` - Home page with role selection
  - (Future expansions planned for user profiles, event details, etc.)

---

## Backend Architecture

### API Design

The backend follows a RESTful API design pattern with the following endpoints:

#### Token Endpoints

- `POST /api/tokens` - Create a new token
- `GET /api/tokens/:id` - Get a specific token by ID
- `GET /api/tokens/creator/:creatorId` - Get all tokens created by a specific user

#### Token Claim Endpoints

- `POST /api/claims` - Create a new token claim
- `GET /api/claims/wallet/:walletAddress` - Get all claims for a specific wallet
- `GET /api/claims/wallet/:walletAddress/with-tokens` - Get all claims with associated token details

#### User Endpoints

- `POST /api/users` - Create a new user or retrieve existing user

### Middleware

- Express middleware for error handling and logging
- Zod for request validation
- (Future) Authentication middleware for protected routes

### Service Layer

The server implements a service layer pattern with the following components:

1. **Storage Service**: Handles database operations using the Drizzle ORM.
2. **Validation Service**: Handles data validation with Zod schemas.
3. **Routes**: Thin controllers that use the services to fulfill API requests.

---

## Database Design

### Entity-Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│    users    │       │    tokens    │       │   token_claims  │
├─────────────┤       ├──────────────┤       ├─────────────────┤
│ id          │       │ id           │       │ id              │
│ username    │←──┐   │ name         │    ┌─→│ tokenId         │
│ password    │   │   │ symbol       │    │  │ userId          │←┐
│ walletAddress│   └───│ creatorId    │    │  │ walletAddress   │ │
└─────────────┘       │ description   │    │  │ claimedAt       │ │
                      │ supply        │    │  │ transactionId   │ │
                      │ claimed       │    │  └─────────────────┘ │
                      │ expiryDate    │    │                      │
                      │ createdAt     │    │                      │
                      │ mintAddress   │────┘                      │
                      └──────────────┘                            │
                                                                  │
                                                                  │
                                                                  │
                           ┌───────────────────────────────────────┘
                           │
                           │
                      ┌────┴─────┐
                      │  events  │
                      └──────────┘
                     (Future Entity)
```

### Schema Design

The database schema is defined using Drizzle ORM with the following tables:

1. **users**:
   - `id`: Serial primary key
   - `username`: Text (unique, not null)
   - `password`: Text (not null)
   - `walletAddress`: Text (nullable)

2. **tokens**:
   - `id`: Serial primary key
   - `name`: Text (not null)
   - `symbol`: Text (not null)
   - `description`: Text (not null)
   - `supply`: Integer (not null)
   - `claimed`: Integer (default 0)
   - `expiryDate`: Timestamp (nullable)
   - `creatorId`: Integer (foreign key to users.id)
   - `createdAt`: Timestamp (not null, default now)
   - `mintAddress`: Text (nullable)

3. **token_claims**:
   - `id`: Serial primary key
   - `tokenId`: Integer (foreign key to tokens.id)
   - `userId`: Integer (foreign key to users.id)
   - `walletAddress`: Text (not null)
   - `claimedAt`: Timestamp (not null, default now)
   - `transactionId`: Text (nullable)

### Relationships

- **One-to-Many**: A user can create many tokens (User → Tokens)
- **One-to-Many**: A user can claim many tokens (User → TokenClaims)
- **One-to-Many**: A token can have many claims (Token → TokenClaims)

---

## Blockchain Integration

Note: Full Solana blockchain integration is planned for future iterations. The current implementation includes preparations and placeholder functionality.

### Solana Integration Design

1. **Wallet Connection**:
   - Integration with Phantom wallet
   - Ability to connect/disconnect wallet
   - Reading wallet address and balance

2. **Token Operations** (Planned):
   - Token minting on Solana blockchain
   - Token metadata storage
   - Token transfer operations

3. **Transaction Handling** (Planned):
   - Building and signing transactions
   - Transaction confirmation tracking
   - Error handling for failed transactions

### Solana Libraries

- `@solana/web3.js`: Core Solana JavaScript API
- `@solana/spl-token`: Library for SPL Token operations

---

## Security Considerations

### Authentication

- Currently using basic username/password authentication
- Future improvements planned:
  - JWT-based authentication
  - Wallet signature verification
  - Two-factor authentication

### Data Validation

- All API inputs are validated using Zod schemas
- Type checking via TypeScript

### Sensitive Data Handling

- Passwords are stored as plain text (NOT RECOMMENDED FOR PRODUCTION)
- Future improvements planned:
  - Password hashing with bcrypt
  - Secure environment variable management
  - Encryption for sensitive fields

### CORS and API Security

- API endpoints are currently open (for development)
- Future improvements planned:
  - CORS configuration
  - Rate limiting
  - API key authentication

---

## API Documentation

### Token Endpoints

#### Create Token

- **URL**: `/api/tokens`
- **Method**: `POST`
- **Auth Required**: No (planned for future)
- **Request Body**:
  ```json
  {
    "name": "Solana Hacker House NYC",
    "symbol": "SHNYC",
    "description": "Proof of participation for Solana Hacker House NYC 2023",
    "supply": 100,
    "expiryDate": "2023-12-31T23:59:59Z",
    "creatorId": 1
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "id": 1,
      "name": "Solana Hacker House NYC",
      "symbol": "SHNYC",
      "description": "Proof of participation for Solana Hacker House NYC 2023",
      "supply": 100,
      "claimed": 0,
      "expiryDate": "2023-12-31T23:59:59Z",
      "creatorId": 1,
      "createdAt": "2023-05-14T19:38:55.670Z",
      "mintAddress": null
    }
    ```

#### Get Token

- **URL**: `/api/tokens/:id`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**: Same as create token response

#### Get Creator Tokens

- **URL**: `/api/tokens/creator/:creatorId`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**: Array of token objects

### Claim Endpoints

#### Create Claim

- **URL**: `/api/claims`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "tokenId": 1,
    "userId": 1,
    "walletAddress": "GkwB82YZTM31kQzx5RV41S7WM44KPdSS22qDd9FRKXnZ"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Claim object

#### Get Wallet Claims

- **URL**: `/api/claims/wallet/:walletAddress`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**: Array of claim objects with associated tokens

### User Endpoints

#### Create/Get User

- **URL**: `/api/users`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "username": "demo_user",
    "password": "password123",
    "walletAddress": "GkwB82YZTM31kQzx5RV41S7WM44KPdSS22qDd9FRKXnZ"
  }
  ```
- **Success Response**:
  - **Code**: 201 (new user) or 200 (existing user)
  - **Content**: User object

---

## Deployment Architecture

### Current Setup

The application is deployed on Replit with the following configuration:

- Single instance running both frontend and backend
- PostgreSQL database via Neon
- Environment variables for database connection

### Production Considerations

For a production deployment, consider the following architecture:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Load Balancer │      │    Web Servers  │      │  Database Tier  │
│   (Cloudflare)  │      │   (Node.js)     │      │  (PostgreSQL)   │
│                 │      │                 │      │                 │
│  ┌───────────┐  │      │  ┌───────────┐  │      │  ┌───────────┐  │
│  │   HTTPS   │  │      │  │ Express   │  │      │  │  Primary  │  │
│  │ Termination│──┼─────┼──┤   API     │──┼─────┼──┤  Database │  │
│  └───────────┘  │      │  └───────────┘  │      │  └───────────┘  │
│                 │      │                 │      │        │        │
│  ┌───────────┐  │      │  ┌───────────┐  │      │        │        │
│  │   CDN     │  │      │  │  Static   │  │      │  ┌───────────┐  │
│  │  Caching  │◄─┼──────┼──┤  Assets   │  │      │  │  Replica  │  │
│  └───────────┘  │      │  └───────────┘  │      │  │ Databases │  │
│                 │      │                 │      │  └───────────┘  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                        ┌─────────────────┐
                        │    Monitoring   │
                        │     & Logs      │
                        └─────────────────┘
```

### Scaling Considerations

- **Horizontal Scaling**: Deploy multiple instances of the web server behind a load balancer
- **Database Scaling**: Use database replication and connection pooling
- **Caching Layer**: Implement Redis or similar for caching frequently accessed data
- **CDN**: Use a CDN for static assets and possibly API response caching

---

## Conclusion

This document provides a comprehensive overview of the Solana POP platform's technical architecture. It is intended to be a living document that evolves as the platform grows and new features are implemented.

For details on features planned for future implementation, see the [FUTURE_FEATURES.md](FUTURE_FEATURES.md) document.

---

© 2025 Solana POP Platform