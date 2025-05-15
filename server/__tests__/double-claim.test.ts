import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { hasUserClaimedToken } from '../storage';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    query: {
      tokenClaims: {
        findFirst: vi.fn(),
      }
    },
    insert: vi.fn(),
  }
}));

describe('Double-Claim Prevention System', () => {
  const mockTokenId = 1;
  const mockWalletAddress = 'ABC123XYZ';
  
  beforeEach(() => {
    // Clear all mocks before each test
    vi.resetAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should detect if a token has been claimed by a wallet', async () => {
    // Mock a scenario where the token has been claimed
    (db.query.tokenClaims.findFirst as any).mockResolvedValue({
      id: 1,
      tokenId: mockTokenId,
      walletAddress: mockWalletAddress,
    });
    
    const result = await hasUserClaimedToken(mockTokenId, mockWalletAddress);
    
    expect(result).toBe(true);
    expect(db.query.tokenClaims.findFirst).toHaveBeenCalledTimes(1);
  });
  
  it('should return false if a token has not been claimed by a wallet', async () => {
    // Mock a scenario where the token has not been claimed
    (db.query.tokenClaims.findFirst as any).mockResolvedValue(null);
    
    const result = await hasUserClaimedToken(mockTokenId, mockWalletAddress);
    
    expect(result).toBe(false);
    expect(db.query.tokenClaims.findFirst).toHaveBeenCalledTimes(1);
  });
  
  it('should throw an error if checking claim status fails', async () => {
    // Mock a database error
    const mockError = new Error('Database connection failed');
    (db.query.tokenClaims.findFirst as any).mockRejectedValue(mockError);
    
    await expect(hasUserClaimedToken(mockTokenId, mockWalletAddress))
      .rejects
      .toThrow('Failed to check if token has been claimed');
  });
}); 