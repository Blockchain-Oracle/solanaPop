import express from 'express';
import { storage } from '../storage';
import { insertWhitelistSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

const router = express.Router();

// Create whitelist entry
router.post('/api/whitelist', async (req, res) => {
  try {
    const entryData = insertWhitelistSchema.parse(req.body);
    
    // Validate that either tokenId or eventId is provided, but not both
    if ((entryData.tokenId && entryData.eventId) || (!entryData.tokenId && !entryData.eventId)) {
      return res.status(400).json({ error: "Exactly one of tokenId or eventId must be provided" });
    }
    
    // Create whitelist entry
    const entry = await storage.createWhitelistEntry(entryData);
    
    // If this is the first whitelist entry, enable whitelist for the token/event
    if (entryData.tokenId) {
      const token = await storage.getToken(entryData.tokenId);
      if (token && !token.whitelistEnabled) {
        await storage.updateToken(entryData.tokenId, { whitelistEnabled: true });
      }
    } else if (entryData.eventId) {
      const event = await storage.getEvent(entryData.eventId);
      if (event && !event.whitelistEnabled) {
        await storage.updateEvent(entryData.eventId, { whitelistEnabled: true });
      }
    }
    
    return res.status(201).json(entry);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    return res.status(500).json({ error: "Failed to create whitelist entry" });
  }
});

// Bulk upload whitelist entries
router.post('/api/whitelist/bulk', async (req, res) => {
  try {
    const { tokenId, eventId, addresses } = req.body;
    
    // Validate that either tokenId or eventId is provided, but not both
    if ((tokenId && eventId) || (!tokenId && !eventId)) {
      return res.status(400).json({ error: "Exactly one of tokenId or eventId must be provided" });
    }
    
    // Validate addresses array
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: "addresses must be a non-empty array" });
    }
    
    // Create entries
    const entries = addresses.map(address => ({
      tokenId: tokenId || null,
      eventId: eventId || null,
      walletAddress: address
    }));
    
    const createdEntries = await storage.bulkAddWhitelistEntries(entries);
    
    // Enable whitelist for the token/event if not already enabled
    if (tokenId) {
      const token = await storage.getToken(tokenId);
      if (token && !token.whitelistEnabled) {
        await storage.updateToken(tokenId, { whitelistEnabled: true });
      }
    } else if (eventId) {
      const event = await storage.getEvent(eventId);
      if (event && !event.whitelistEnabled) {
        await storage.updateEvent(eventId, { whitelistEnabled: true });
      }
    }
    
    return res.status(201).json(createdEntries);
  } catch (error) {
    console.error("Error adding bulk whitelist entries:", error);
    return res.status(500).json({ error: "Failed to add whitelist entries" });
  }
});

// Get whitelist for token or event
router.get('/api/whitelist', async (req, res) => {
  try {
    const { tokenId, eventId } = req.query;
    
    // Validate that either tokenId or eventId is provided, but not both
    if ((tokenId && eventId) || (!tokenId && !eventId)) {
      return res.status(400).json({ error: "Exactly one of tokenId or eventId must be provided" });
    }
    
    let entries = [];
    if (tokenId) {
      const id = parseInt(tokenId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid token ID" });
      }
      entries = await storage.getWhitelistForToken(id);
    } else if (eventId) {
      const id = parseInt(eventId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      entries = await storage.getWhitelistForEvent(id);
    }
    
    return res.json(entries);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch whitelist entries" });
  }
});

// Delete whitelist entry
router.delete('/api/whitelist/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid whitelist entry ID" });
    }
    
    const success = await storage.deleteWhitelistEntry(id);
    if (!success) {
      return res.status(404).json({ error: "Whitelist entry not found or could not be deleted" });
    }
    
    return res.json({ success: true, message: "Whitelist entry deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete whitelist entry" });
  }
});

// Check if address is whitelisted
router.get('/api/whitelist/check', async (req, res) => {
  try {
    const { tokenId, eventId, walletAddress } = req.query;
    
    // Validate that either tokenId or eventId is provided, but not both
    if ((tokenId && eventId) || (!tokenId && !eventId)) {
      return res.status(400).json({ error: "Exactly one of tokenId or eventId must be provided" });
    }
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    let isWhitelisted = false;
    if (tokenId) {
      const id = parseInt(tokenId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid token ID" });
      }
      isWhitelisted = await storage.isAddressWhitelistedForToken(id, walletAddress as string);
    } else if (eventId) {
      const id = parseInt(eventId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      isWhitelisted = await storage.isAddressWhitelistedForEvent(id, walletAddress as string);
    }
    
    return res.json({ isWhitelisted });
  } catch (error) {
    return res.status(500).json({ error: "Failed to check whitelist status" });
  }
});

// Toggle whitelist for token
router.post('/api/tokens/:id/whitelist/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid token ID" });
    }
    
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "enabled must be a boolean value" });
    }
    
    const token = await storage.updateToken(id, { whitelistEnabled: enabled });
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    
    return res.json(token);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update token whitelist status" });
  }
});

// Toggle whitelist for event
router.post('/api/events/:id/whitelist/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }
    
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "enabled must be a boolean value" });
    }
    
    const event = await storage.updateEvent(id, { whitelistEnabled: enabled });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    return res.json(event);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update event whitelist status" });
  }
});

export default router; 