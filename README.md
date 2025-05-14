# Solana Proof-of-Participation

A full-stack application for creating and claiming compressed tokens (cTokens) for events and experiences on Solana.

## Features

- Interactive animated token cards with flip effects
- Event creation for organizers
- Token claiming for attendees
- QR code generation and scanning
- Compressed NFT token support

## Animated Tokens

The application features interactive token cards that:

- Automatically flip to reveal information in a cascading sequence
- Respond to hover with a floating animation
- Show key steps in the proof-of-participation process
- Can be clicked to manually flip and show additional information

## Getting Started

### Prerequisites

- Node.js (v16+)
- pnpm
- Docker and Docker Compose
- PostgreSQL (local development via Docker)

### Setup

1. Start the PostgreSQL database:

```bash
docker-compose up -d
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm run dev
```

4. Open [http://localhost:4000](http://localhost:4000) in your browser.

## Environment Variables

Create a `.env` file in the root directory with the following:

```
# Local development PostgreSQL database URL
DATABASE_URL=postgres://postgres:postgres@localhost:5432/solanapop_dev

# Server port
PORT=4000
```

## Technology Stack

- Frontend: React, TypeScript, Tailwind CSS, Framer Motion
- Backend: Express.js, Node.js
- Database: PostgreSQL with Drizzle ORM
- Blockchain: Solana, Compressed NFTs

## License

MIT 