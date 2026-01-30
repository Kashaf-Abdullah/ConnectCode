const redisService = require('../services/redisService..js');
const CodeGenerator = require('../utils/codeGenerator');

class SocketController {
  constructor(io) {
    this.io = io;
    this.desktopSockets = new Map(); // socketId -> code
    this.mobileSockets = new Map(); // socketId -> code
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Desktop connects - generate or retrieve code
      socket.on('desktop:connect', async () => {
        try {
          // Check if this socket already has a code
          let code = this.desktopSockets.get(socket.id);
          
          if (!code) {
            // Generate new code
            code = CodeGenerator.generate();
            
            // Ensure code is unique
            let exists = await redisService.codeExists(code);
            let attempts = 0;
            while (exists && attempts < 10) {
              code = CodeGenerator.generate();
              exists = await redisService.codeExists(code);
              attempts++;
            }

            // Store desktop socket with code
            await redisService.createPair(code, socket.id);
            this.desktopSockets.set(socket.id, code);
          } else {
            // Reconnect - update socket ID in Redis
            await redisService.createPair(code, socket.id);
          }

          // Send code to desktop
          socket.emit('desktop:code', { code });
          console.log(`Desktop connected with code: ${code}, socket: ${socket.id}`);

          // Send any existing link if available
          const existingLink = await redisService.getLink(code);
          if (existingLink) {
            socket.emit('desktop:link', { link: existingLink });
          }
        } catch (error) {
          console.error('Error in desktop:connect:', error);
          socket.emit('desktop:error', { message: 'Failed to generate code' });
        }
      });
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
      // Mobile connects and validates code
      socket.on('mobile:validate', async (data) => {
        try {
          const { code } = data;

          if (!code || !CodeGenerator.isValidFormat(code)) {
            socket.emit('mobile:error', { message: 'Invalid code format' });
            return;
          }

          const exists = await redisService.codeExists(code);
          if (!exists) {
            socket.emit('mobile:error', { message: 'Code not found or expired' });
            return;
          }

          // Link mobile socket to code
          await redisService.linkMobileSocket(code, socket.id);
          this.mobileSockets.set(socket.id, code);

          // Notify mobile of successful pairing
          socket.emit('mobile:paired', { code, success: true });
          console.log(`Mobile paired with code: ${code}, socket: ${socket.id}`);

          // Notify desktop that mobile is connected
          const desktopSocketId = await redisService.getDesktopSocket(code);
          if (desktopSocketId) {
            this.io.to(desktopSocketId).emit('desktop:mobile-connected', { code });
          }
        } catch (error) {
          console.error('Error in mobile:validate:', error);
          socket.emit('mobile:error', { message: 'Failed to validate code' });
        }
      });

      // Mobile submits link
      socket.on('mobile:submit-link', async (data) => {
        try {
          const { link } = data;
          const code = this.mobileSockets.get(socket.id);

          if (!code) {
            socket.emit('mobile:error', { message: 'Not paired. Please enter code again.' });
            return;
          }

          if (!link || typeof link !== 'string' || link.trim().length === 0) {
            socket.emit('mobile:error', { message: 'Invalid link' });
            return;
          }

          // Validate URL format
          try {
            new URL(link);
          } catch {
            socket.emit('mobile:error', { message: 'Invalid URL format' });
            return;
          }

          // Store link in Redis
          await redisService.storeLink(code, link.trim());

          // Get desktop socket and emit link
          const desktopSocketId = await redisService.getDesktopSocket(code);
          if (desktopSocketId) {
            this.io.to(desktopSocketId).emit('desktop:link', { link: link.trim() });
            socket.emit('mobile:link-sent', { success: true });
            console.log(`Link sent from mobile to desktop: ${code} -> ${link.trim()}`);
          } else {
            socket.emit('mobile:error', { message: 'Desktop not connected' });
          }
        } catch (error) {
          console.error('Error in mobile:submit-link:', error);
          socket.emit('mobile:error', { message: 'Failed to submit link' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          const code = this.desktopSockets.get(socket.id) || this.mobileSockets.get(socket.id);
          
          if (code) {
            // Check if this was desktop or mobile
            if (this.desktopSockets.has(socket.id)) {
              // Desktop disconnected - cleanup everything
              await redisService.cleanupPair(code);
              this.desktopSockets.delete(socket.id);
              console.log(`Desktop disconnected, cleaned up code: ${code}`);
            } else if (this.mobileSockets.has(socket.id)) {
              // Mobile disconnected - just remove mobile link
              const mobileKey = await redisService.generateMobileKey(code);
              await redisService.client.del(mobileKey);
              this.mobileSockets.delete(socket.id);
              
              // Notify desktop
              const desktopSocketId = await redisService.getDesktopSocket(code);
              if (desktopSocketId) {
                this.io.to(desktopSocketId).emit('desktop:mobile-disconnected', { code });
              }
              console.log(`Mobile disconnected from code: ${code}`);
            }
          }
        } catch (error) {
          console.error('Error in disconnect handler:', error);
        }
      });
    });
  }
}

module.exports = SocketController;

