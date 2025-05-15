# Solana POP - Proof-of-Participation Token Platform

![Solana POP](client/public/header_image.svg)

A web-based platform for minting and distributing Proof-of-Participation tokens on the Solana blockchain, with QR code generation and Solana Pay integration.

## 🌟 Features

- **Creator Interface**: Mint experience tokens (cTokens) for event airdrops
- **QR Code Generation**: Easily distribute tokens via shareable QR codes
- **Attendee Interface**: Claim tokens by scanning QR codes
- **Solana Integration**: Built on Solana blockchain for security and transparency
- **Database Storage**: PostgreSQL database for reliable data persistence
- **Modern UI**: Sleek, responsive interface with Solana-inspired design

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Documentation](#documentation)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Quick Start

Try the live demo at [solanapop.replit.app](https://solanapop.replit.app)

## 💻 Installation

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- Phantom Wallet (for Solana integration)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/solana-pop.git
cd solana-pop
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://username:password@localhost:5432/solanapop
```

4. Push database schema:

```bash
npm run db:push
```

5. Start the development server:

```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:5000`

## 🔍 Usage

### For Event Creators

1. Connect your Phantom wallet
2. Select "Event Creators" from the homepage
3. Create a new token by filling out the form
4. Generate and share the QR code for attendees to scan

### For Event Attendees

1. Connect your Phantom wallet
2. Select "Event Attendees" from the homepage
3. Scan the QR code provided by the event creator
4. View your collected tokens in your collection

For more detailed instructions, see the [User Guide](documentation/USER_GUIDE.md).

## 📚 Documentation

- [User Guide](documentation/USER_GUIDE.md) - How to use the platform
- [Technical Architecture](documentation/TECHNICAL_ARCHITECTURE.md) - Detailed system design
- [Future Features](documentation/FUTURE_FEATURES.md) - Roadmap for upcoming functionality

## 🛠️ Technology Stack

### Frontend
- React (TypeScript)
- TailwindCSS / ShadCN UI
- TanStack Query
- Wouter (routing)

### Backend
- Express.js
- Drizzle ORM
- PostgreSQL (via Neon serverless)

### Blockchain
- Solana Web3.js
- Solana SPL Token

## 📁 Project Structure

```
├── client/ - Frontend React application
│   ├── public/ - Static assets
│   └── src/ - React source code
│       ├── components/ - UI components
│       ├── hooks/ - Custom React hooks
│       ├── lib/ - Utility functions
│       └── pages/ - Page components
│
├── server/ - Backend Express application
│   ├── db.ts - Database connection setup
│   ├── index.ts - Server entry point
│   ├── routes.ts - API routes
│   ├── storage.ts - Data storage services
│   └── vite.ts - Development server configuration
│
├── shared/ - Shared code between client and server
│   └── schema.ts - Database schema and types
│
├── documentation/ - Project documentation
│   ├── USER_GUIDE.md - User guide
│   ├── TECHNICAL_ARCHITECTURE.md - System architecture
│   └── FUTURE_FEATURES.md - Upcoming features
│
└── drizzle.config.ts - Drizzle ORM configuration
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for the Solana community