# Solana POP Platform - User Guide

Welcome to the Solana Proof-of-Participation (POP) Token Platform! This guide will walk you through the currently implemented features and how to use them effectively.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [For Event Creators](#for-event-creators)
4. [For Event Attendees](#for-event-attendees)
5. [Event Management](#event-management)
6. [Wallet Integration](#wallet-integration)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

The Solana POP platform allows event organizers to create and distribute Proof-of-Participation tokens (cTokens) on the Solana blockchain. These tokens serve as digital proof that someone attended or participated in an event, similar to digital badges or certificates.

### Key Features

- **For Event Creators**: Create and manage participation tokens for your events
- **For Event Attendees**: Collect tokens by scanning QR codes at events
- **Solana Integration**: Tokens exist on the Solana blockchain for transparency and ownership
- **User-Friendly Interface**: Simple and intuitive design for both creators and attendees

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Phantom Wallet browser extension (or mobile app)
- Internet connection

### First Time Setup

1. **Connect Your Wallet**:
   - Click the "Connect Wallet" button in the top-right corner
   - Select Phantom from the wallet options (currently only Phantom is supported)
   - Approve the connection request in your wallet

2. **Choose Your Role**:
   - From the homepage, select either "Event Creator" or "Event Attendee" based on your needs

---

## For Event Creators

As an event creator, you can generate participation tokens for your events and distribute them to attendees via QR codes.

### Creating a New Token

1. Select "Event Creators" from the homepage
2. Click the "Create Event" button
3. Fill out the token creation form:
   - **Token Name**: Enter a descriptive name (e.g., "Solana Hacker House NYC 2023")
   - **Token Symbol**: Enter a short identifier (e.g., "SHNYC")
   - **Token Description**: Provide details about what the token represents
   - **Supply**: Set the maximum number of tokens that can be claimed
   - **Token Expiry** (Optional): Set a date after which the token can no longer be claimed

4. Click "Create Token" to mint your new token

### Generating QR Codes

1. Find your token in the "Your Tokens" section
2. Click the "Show QR" button next to the token
3. A QR code modal will appear with the following options:
   - View the QR code that attendees can scan
   - Download the QR code as an image file
   - Share the QR code via various platforms

### Distributing Tokens

There are several ways to distribute your QR codes to event attendees:

1. **At Physical Events**:
   - Display the QR code on a screen during the event
   - Print the QR code and post it at the event venue
   - Include the QR code in printed event materials

2. **For Virtual Events**:
   - Share the QR code during a video conference
   - Email the QR code to registered attendees
   - Include the QR code in virtual event platforms

### Monitoring Token Claims

1. View your token in the "Your Tokens" section
2. Check the "Claimed" counter to see how many tokens have been claimed
3. More detailed analytics will be available in future updates

---

## For Event Attendees

As an event attendee, you can collect tokens by scanning QR codes at events and build your token collection.

### Scanning QR Codes

1. Select "Event Attendees" from the homepage
2. Click the "Claim Tokens" button
3. Connect your wallet if you haven't already
4. Click "Scan QR Code" to activate the camera
   - Note: Currently, this is a simulation since the camera functionality is not fully implemented
   - In a future update, this will activate your device's camera to scan QR codes

### Viewing Your Collection

1. After connecting your wallet, your claimed tokens will appear in the "Your Collection" section
2. Each token card displays:
   - Token name and symbol
   - The date when you claimed it
   - A description of what the token represents

### Claiming Tokens

The current version simulates token claiming for demonstration purposes:

1. Click the "Scan QR Code" button
2. The system will simulate scanning and processing
3. After a brief moment, a success modal will appear showing the claimed token
4. The token will be added to your collection

---

## Event Management

The platform now allows event creators to create and manage events, with optional integration with participation tokens.

### Creating a New Event

1. Select "Event Creators" from the homepage, or navigate to the dashboard
2. Click the "Create Event" button in the dashboard header
3. Fill out the event creation form:
   - **Event Name**: Enter a descriptive name (e.g., "Solana Hacker House NYC")
   - **Event Date**: Select the start date of your event
   - **Event Type**: Choose from options like conference, workshop, hackathon, etc.
   - **Location**: Provide physical address or virtual event URL
   - **Description**: Describe your event and what attendees can expect
   - **Capacity**: Set the maximum number of attendees
   - **End Date** (Optional): For multi-day events, set the final day
   - **Token Integration** (Optional): Link existing tokens for attendance verification

4. Click "Create Event" to save your event

### Managing Events

1. Find your events in the "My Events" tab on the dashboard
2. Click on an event to view details, manage attendees, or update information
3. Generate QR codes for event check-in
4. Track attendance and participation

### Token Integration

Events can be integrated with tokens in several ways:

1. **Required Tokens**: Require attendees to hold specific tokens to register
2. **Participation Tokens**: Automatically distribute tokens to verified attendees
3. **Token-Gated Access**: Control access to event areas or features based on tokens

---

## Wallet Integration

The platform currently integrates with the Phantom wallet, which is required to use the application.

### Connecting Your Wallet

1. Click the "Connect Wallet" button in the top-right corner
2. If you have Phantom wallet installed, it will prompt you to connect
3. Approve the connection request in your wallet
4. Your wallet address will appear in the header when connected

### Disconnecting Your Wallet

1. Click on your wallet address in the header
2. Select "Disconnect" to end the session

### Wallet Requirements

- Phantom wallet browser extension or mobile app
- A Solana account with at least a small amount of SOL for transaction fees (when real blockchain integration is implemented)

---

## Troubleshooting

### Common Issues

**Wallet Connection Problems**
- Ensure you have Phantom wallet installed
- Try refreshing the page and connecting again
- Make sure your wallet is unlocked before attempting to connect

**Token Creation Issues**
- All required fields must be filled out
- Token symbol must be unique and between 2-10 characters
- Supply must be at least 1

**QR Code Scanning Issues**
- This feature is currently simulated and will be fully implemented in a future update
- In the full implementation, ensure good lighting and hold the camera steady when scanning

### Getting Help

For additional assistance:
- Check the documentation in the repository
- Open an issue on the GitHub repository
- Contact the development team with specific questions

---

## Future Enhancements

Many exciting features are planned for future updates. See the [FUTURE_FEATURES.md](FUTURE_FEATURES.md) document for a detailed roadmap of upcoming functionality.

---

© 2025 Solana POP Platform