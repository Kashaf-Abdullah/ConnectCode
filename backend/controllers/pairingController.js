const redisService = require('../services/redisService..js');
const CodeGenerator = require('../utils/codeGenerator');

class PairingController {
  constructor(io) {
    this.io = io;
  }

  // Generate or get existing code for desktop (REST API)
  async generateCode(req, res) {
    try {
      // This is typically called by desktop page
      // In real-time flow, socket handles this, but REST endpoint for fallback
      let code = CodeGenerator.generate();
      
      // Ensure uniqueness
      let exists = await redisService.codeExists(code);
      let attempts = 0;
      while (exists && attempts < 10) {
        code = CodeGenerator.generate();
        exists = await redisService.codeExists(code);
        attempts++;
      }

      // Store code in Redis with placeholder socket ID for REST API
      // When desktop connects via Socket.IO, it will update the socket ID
      try {
        await redisService.createPair(code, 'REST-API-PLACEHOLDER');
        console.log(`✅ Code generated and stored: ${code}`);
      } catch (error) {
        console.error(`❌ Failed to store code ${code} in Redis:`, error);
        return res.status(500).json({
          success: false,
          error: 'Failed to store code in Redis. Please check Redis connection.'
        });
      }

      res.json({
        success: true,
        code,
        message: 'Code generated successfully'
      });
    } catch (error) {
      console.error('Error generating code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate code'
      });
    }
  }

  // Validate code entered by mobile user (REST API)
  async validateCode(req, res) {
    try {
      // Check if req.body exists
      if (!req.body) {
        return res.status(400).json({
          success: false,
          error: 'Request body is required'
        });
      }

      const { code } = req.body;

      if (!code || !CodeGenerator.isValidFormat(code)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid code format'
        });
      }

      const exists = await redisService.codeExists(code);
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: 'Code not found or expired'
        });
      }

      const ttl = await redisService.getTTL(code);
      const expiresIn = Math.floor(ttl / 60); // minutes

      res.json({
        success: true,
        code,
        expiresIn,
        message: 'Code is valid'
      });
    } catch (error) {
      console.error('Error validating code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate code'
      });
    }
  }

  // Submit link from mobile (REST API - fallback if socket fails)
  async submitLink(req, res) {
    try {
      // Check if req.body exists
      if (!req.body) {
        return res.status(400).json({
          success: false,
          error: 'Request body is required'
        });
      }

      const { code, link } = req.body;

      if (!code || !CodeGenerator.isValidFormat(code)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid code format'
        });
      }

      if (!link || typeof link !== 'string' || link.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid link'
        });
      }

      // Validate URL format
      try {
        new URL(link);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format'
        });
      }

      const exists = await redisService.codeExists(code);
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: 'Code not found or expired'
        });
      }

      // Store link
      await redisService.storeLink(code, link.trim());
      console.log(`✅ Link stored via REST API for code: ${code}`);

      // Emit to desktop via Socket.IO if desktop is connected
      const desktopSocketId = await redisService.getDesktopSocket(code);
      if (desktopSocketId && this.io && desktopSocketId !== 'REST-API-PLACEHOLDER') {
        // Desktop is connected via Socket.IO, send link in real-time
        this.io.to(desktopSocketId).emit('desktop:link', { link: link.trim() });
        console.log(`✅ Link sent to desktop via Socket.IO: ${code}`);
      } else {
        // Desktop not connected via Socket.IO (using REST API)
        // Link is stored and will be sent when desktop connects
        console.log(`ℹ️ Link stored for code ${code}, desktop will receive it when connected via Socket.IO`);
      }

      res.json({
        success: true,
        message: 'Link submitted successfully',
        note: desktopSocketId === 'REST-API-PLACEHOLDER' 
          ? 'Desktop not connected via Socket.IO. Link is stored and will be available when desktop connects.'
          : 'Link sent to desktop in real-time.'
      });
    } catch (error) {
      console.error('Error submitting link:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit link'
      });
    }
  }

  // Get all active codes (for admin)
  async getActiveCodes(req, res) {
    try {
      const activePairs = await redisService.getActivePairs();
      
      res.json({
        success: true,
        count: activePairs.length,
        codes: activePairs
      });
    } catch (error) {
      console.error('Error getting active codes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active codes'
      });
    }
  }
}

module.exports = PairingController;

