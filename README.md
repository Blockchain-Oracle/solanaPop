# SolanaPop

A token and event management platform built on Solana blockchain that leverages ZK Compression and Solana Pay for efficient token issuance and event ticketing.

> ⚠️ **WARNING**: This codebase has not been audited and is intended for demonstration purposes only. It should not be used in production environments. Use at your own risk.

**Hackathon Submission**: [1000x Hackathon](https://earn.superteam.fun/listing/1000x-hackathon/)

**Demo**: [Live App](http://ws0w08k8880c4c4g4cco88gk.34.67.137.207.sslip.io/)

**Demo Video**: [Loom Video](https://www.loom.com/share/4b78e0b2e32a44ec9ddd8c43a6922203?sid=3dab6696-8a1f-4684-a17d-2468d7677b25)

**Repository**: [GitHub](https://github.com/Blockchain-Oracle/solanaPop.git)

## Overview

SolanaPop is a comprehensive platform designed to streamline the creation, distribution, and management of tokens and events on the Solana blockchain. The application leverages Solana's high-speed, low-cost infrastructure and enhances it further with ZK Compression technology to make token management significantly more cost-effective.

## Features

- **Token Creation and Management**: Create fungible SPL tokens with customizable properties
- **ZK Compressed Tokens**: Reduce token costs by up to 5000x using Solana's ZK Compression
- **Event Creation**: Create public or private events with optional token requirements
- **Whitelist Management**: Manage access to tokens and events with whitelisting capabilities
- **QR Code Integration**: Generate and scan QR codes for token claims and event attendance
- **Solana Pay Integration**: Accept payments using the Solana Pay protocol
- **Mobile-Friendly Interface**: Responsive design for both desktop and mobile users

## Architecture

### Frontend

The frontend is built with React using a modern component architecture:

- **React** for UI components
- **Tailwind CSS** and **Shadcn/UI** for styling
- **Wouter** for routing
- **React Query** for data fetching and caching
- **React Hook Form** with **Zod** for form validation
- **Solana Wallet Adapter** for wallet connectivity

### Backend

The backend is built with Express.js and integrates with Solana's ecosystem:

- **Express.js** REST API
- **Drizzle ORM** with **PostgreSQL** for database management
- **@solana/web3.js** for Solana blockchain interactions
- **@metaplex-foundation** libraries for token metadata
- **@solana/pay** for payment processing
- **@lightprotocol/stateless.js** and **@lightprotocol/compressed-token** for ZK Compression

### Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: User accounts with wallet addresses
- **tokens**: Token information including metadata and compression state
- **events**: Event information with optional token requirements
- **token_claims**: Tracks token claims by users
- **whitelists**: Manages access control for tokens and events

## ZK Compression

SolanaPop implements Solana's ZK Compression technology, allowing for:

- Up to 5000x cheaper token account creation
- Fully compatible with regular SPL tokens
- Atomic compression and decompression between SPL and compressed tokens
- Lower storage costs while maintaining Solana's security guarantees

## Solana Pay Integration

SolanaPop integrates Solana Pay for seamless payment processing:

- Generate QR codes for token claims
- Process payments for event tickets
- Verify transactions on-chain
- Reference-based transaction tracking

# SolanaPop: Architecture Deep Dive

## Services Layer Architecture

The core functionality of SolanaPop is implemented through a modular service-oriented architecture, with each service handling specific responsibilities:

### CompressionService
- Manages ZK Compression token operations
- Interfaces with Light Protocol's stateless.js and compressed-token libraries
- Provides critical methods:
  - `mintCompressedTokens()`: Creates new compressed tokens with minimal storage cost
  - `getCompressedTokenBalance()`: Retrieves user balances for compressed tokens
  - `transferCompressedTokens()`: Executes transfers between wallets with ZK proofs

### KeysService
- Central security management for blockchain interactions
- Handles keypair generation, storage, and access
- Manages service-specific keypairs:
  - Standard service keypair for general operations
  - Compression-specific keypair for ZK operations
  - Treasury keypair for financial operations
- Implements automated funding mechanisms to ensure service accounts have sufficient SOL

### TransferService
- Handles token transfer operations
- Implements transferring both standard SPL tokens and compressed tokens
- Coordinates with KeysService for signing transactions
- Manages on-chain confirmations and error handling

### TokenService
- High-level token management operations
- Interfaces with database for token record management
- Coordinates with MetadataService and CompressionService
- Handles token claim operations and supply management

### MetadataService
- Manages token and collection metadata
- Handles IPFS uploads for token images and metadata
- Creates and updates on-chain token metadata
- Implements Metaplex standards for token metadata

## System Interaction Flow

```
┌─────────────┐     ┌───────────────┐     ┌────────────────┐     ┌──────────────┐
│ API Routes  │────▶│ Service Layer │────▶│ Solana Network │────▶│ Database     │
└─────────────┘     └───────────────┘     └────────────────┘     └──────────────┘
                           │                      ▲
                           ▼                      │
                    ┌─────────────┐       ┌──────────────┐
                    │ ZK Proof    │       │ IPFS Storage │
                    │ Generation  │       │              │
                    └─────────────┘       └──────────────┘
```

1. **Client Requests**: Flow through Express routes to appropriate services
2. **Service Coordination**: Services interact with each other as needed:
   - TokenService uses CompressionService for compressed tokens
   - All services leverage KeysService for transaction signing
   - MetadataService works with TokenService for metadata management

3. **Blockchain Interaction**:
   - Standard operations use @solana/web3.js
   - Compressed token operations use Light Protocol libraries
   - ZK proofs are generated and validated when using compressed tokens

4. **Data Persistence**:
   - Token/Event metadata stored in PostgreSQL via Drizzle ORM
   - Token images and metadata stored on IPFS
   - State roots stored on-chain for ZK Compression

## ZK Compression Implementation

The compression flow works as follows:

1. User requests token creation with compression enabled
2. System fetches state tree information from ZK Compression RPC
3. Token is created with compressed state, reducing costs by up to 5000x
4. When transferring compressed tokens:
   - System fetches account state
   - Requests validity proofs from RPC
   - Bundles proof with transfer transaction
   - Submits transaction with additional compute budget

## Solana Pay Integration

The platform integrates Solana Pay through:

1. QR code generation for token claims and event tickets
2. Unique reference generation for transaction tracking
3. On-chain verification of payment completions
4. Integration with frontend for seamless payment flows

This architecture enables SolanaPop to provide a cost-effective, scalable solution for token and event management on Solana, leveraging cutting-edge ZK Compression technology while maintaining a user-friendly experience.

## Security Considerations

This project was developed as a hackathon submission and demonstrates concepts and technologies that can be used with Solana and ZK Compression. However, there are important security considerations to be aware of:

- **No Formal Audit**: The codebase has not undergone a formal security audit by blockchain security professionals.
- **Experimental Technology**: ZK Compression is a relatively new technology on Solana, and its implementation continues to evolve.
- **Key Management**: The service uses keypairs stored in environment variables which would need more robust security measures for production use.
- **Smart Contract Risks**: Interactions with smart contracts always carry inherent risks.
- **Limited Testing**: While the code has been tested in a development environment, it hasn't been rigorously tested for all edge cases or under high-load conditions.

For production applications, we strongly recommend:
- Conducting comprehensive security audits
- Implementing proper key management solutions
- Adding extensive error handling and recovery mechanisms
- Setting up monitoring and alerting systems
- Thoroughly testing all blockchain interactions under various conditions

## Getting Started

### Prerequisites

- Node.js (v16+)
- pnpm (preferred) or npm
- PostgreSQL database
- Solana wallet (for development testing)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Blockchain-Oracle/solanaPop.git
   cd solanaPop
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure environment variables:
   ```
   cp .env.example .env
   # Edit .env with your database and Solana RPC details
   ```

4. Run database migrations:
   ```bash
   pnpm db:push
   ```

5. Start development server:
   ```bash
   pnpm dev
   ```

### Deployment

For production deployment:

1. Build the application:
   ```bash
   pnpm build
   ```

2. Start the production server:
   ```bash
   pnpm start
   ```

## Hackathon Context

This project was developed for the "1000x Hackathon" by ZK Compression, which focused on implementing Solana's ZK Compression technology. The hackathon challenged developers to create applications that leverage this technology to drastically reduce on-chain storage costs.

The competition emphasized applications that could best demonstrate the scaling capabilities of ZK Compression while maintaining user-friendly experiences. The SolanaPop project exemplifies this by combining compressed tokens with event management workflows, showcasing a practical use case for the technology.

## License

MIT 