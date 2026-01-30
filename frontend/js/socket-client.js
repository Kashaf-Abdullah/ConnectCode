// Shared Socket.IO client utilities
class SocketClient {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // 1 second
  }

  connect(serverUrl = '') {
    // Auto-detect server URL if not provided
    const url = serverUrl || window.location.origin;
    
    this.socket = io(url, {
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000
    });

    this.setupEventHandlers();
    return this.socket;
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      this.onConnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.onDisconnect(reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
      this.onConnectError(error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      this.onReconnect(attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
      this.onReconnectError(error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Reconnection failed after', this.maxReconnectAttempts, 'attempts');
      this.onReconnectFailed();
    });
  }

  // Override these methods in subclasses or set callbacks
  onConnect() {}
  onDisconnect(reason) {}
  onConnectError(error) {}
  onReconnect(attemptNumber) {}
  onReconnectError(error) {}
  onReconnectFailed() {}

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    }
    console.warn('Socket not connected, cannot emit:', event);
    return false;
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}

