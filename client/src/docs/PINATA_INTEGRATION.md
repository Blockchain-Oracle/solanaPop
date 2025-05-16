# Pinata IPFS Integration for SolanaPOP

## Overview

This document explains how SolanaPOP uses Pinata for IPFS storage to store token metadata and images for NFT minting on Solana.

## What is Pinata?

Pinata is a pinning service for IPFS (InterPlanetary File System), which allows us to store files in a decentralized manner. When files are uploaded to IPFS, they are given a unique Content Identifier (CID) that can be used to retrieve them from any IPFS node. Pinata ensures these files remain accessible.

## Integration Details

We've integrated Pinata for two main purposes:

1. **Store token images** - When a user uploads an image for their token, it's stored on IPFS through Pinata
2. **Store token metadata** - JSON metadata files containing token information are stored on IPFS through Pinata

## Implementation

### Client-Side Integration

The client-side integration allows uploading token images directly from the browser:

- Located in `client/src/services/metadata-service.ts`
- Uses the Pinata SDK to upload files and JSON to IPFS
- Falls back to simulation if Pinata credentials aren't available (development mode)
- Returns IPFS URIs that can be used in token metadata

### Server-Side Integration

The server-side integration handles token metadata storage:

- Located in `server/services/metadata-service.ts`
- Converts Buffer image data to temporary files for upload
- Uploads both images and JSON metadata to IPFS
- Returns metadata URIs for use in token creation

## Environment Configuration

The following environment variables are used for Pinata integration:

```
# Server-side Pinata config
PINATA_JWT=your_pinata_jwt_here
PINATA_GATEWAY_URL=your_gateway_domain.mypinata.cloud

# Client-side Pinata config (prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_here
NEXT_PUBLIC_PINATA_GATEWAY_URL=your_gateway_domain.mypinata.cloud
```

## Getting Started with Pinata

1. Create a free account at [pinata.cloud](https://www.pinata.cloud/)
2. Generate an API key from the dashboard
3. Copy the JWT token and gateway URL to your environment variables
4. Install the Pinata package: `pnpm add pinata`

## Benefits of IPFS Storage

- **Decentralized** - Content is not stored on a single server but distributed across the IPFS network
- **Content-addressable** - Files are identified by their content, not location
- **Immutable** - Once content is on IPFS, it cannot be changed
- **Persistent** - With Pinata pinning, content remains available even if your node goes offline

## Usage in Token Creation Flow

1. User uploads an image when creating a token
2. The image is stored on IPFS via Pinata
3. Token metadata JSON is created and also stored on IPFS
4. The metadata URI is used when minting the token on Solana
5. Token metadata includes a link to the IPFS-stored image

## Reference Links

- [Pinata Documentation](https://docs.pinata.cloud/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Metaplex Token Standard](https://docs.metaplex.com/programs/token-metadata/overview) 