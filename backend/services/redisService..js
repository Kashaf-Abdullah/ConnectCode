const Redis = require('ioredis');

class RedisService {
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('Connecting to Redis:', redisUrl);
    
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    // Redis connection event handlers
    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready to accept commands');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    this.client.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });

    this.PAIR_PREFIX = 'pair:';
    this.LINK_PREFIX = 'link:';
    this.MOBILE_PREFIX = 'mobile:';
    this.EXPIRY_SECONDS = 3600; // 1 hour (60 minutes)
  }

  async generatePairKey(code) {
    return `${this.PAIR_PREFIX}${code}`;
  }

  async generateLinkKey(code) {
    return `${this.LINK_PREFIX}${code}`;
  }

  async generateMobileKey(code) {
    return `${this.MOBILE_PREFIX}${code}`;
  }

  // Create or update pair with desktop socket ID
  async createPair(code, desktopSocketId) {
    try {
      const key = await this.generatePairKey(code);
      const result = await this.client.setex(key, this.EXPIRY_SECONDS, desktopSocketId);
      console.log(`✅ Stored code in Redis: ${key} = ${desktopSocketId} (TTL: ${this.EXPIRY_SECONDS}s)`);
      return result;
    } catch (error) {
      console.error(`❌ Error storing code ${code} in Redis:`, error.message);
      throw error;
    }
  }

  // Get desktop socket ID for a code
  async getDesktopSocket(code) {
    const key = await this.generatePairKey(code);
    return this.client.get(key);
  }

  // Store link for a code (replaces previous link)
  async storeLink(code, link) {
    const key = await this.generateLinkKey(code);
    return this.client.setex(key, this.EXPIRY_SECONDS, link);
  }

  // Get stored link for a code
  async getLink(code) {
    const key = await this.generateLinkKey(code);
    return this.client.get(key);
  }

  // Link mobile socket to a code
  async linkMobileSocket(code, mobileSocketId) {
    const key = await this.generateMobileKey(code);
    return this.client.setex(key, this.EXPIRY_SECONDS, mobileSocketId);
  }

  // Get mobile socket ID for a code
  async getMobileSocket(code) {
    const key = await this.generateMobileKey(code);
    return this.client.get(key);
  }

  // Check if code exists and is valid
  async codeExists(code) {
    const key = await this.generatePairKey(code);
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  // Get TTL (time to live) for a code
  async getTTL(code) {
    const key = await this.generatePairKey(code);
    return this.client.ttl(key);
  }

  // Get all active pairs with details
  async getActivePairs() {
    const keys = await this.client.keys(`${this.PAIR_PREFIX}*`);
    if (keys.length === 0) return [];

    const pairs = await this.client.mget(...keys);
    const result = [];

    for (let i = 0; i < keys.length; i++) {
      const code = keys[i].replace(this.PAIR_PREFIX, '');
      const desktopSocketId = pairs[i];
      
      if (desktopSocketId) {
        const ttl = await this.client.ttl(keys[i]);
        const link = await this.getLink(code);
        const mobileSocketId = await this.getMobileSocket(code);

        result.push({
          code,
          desktopSocketId,
          mobileSocketId: mobileSocketId || null,
          link: link || null,
          ttl, // seconds remaining
          expiresIn: Math.floor(ttl / 60) // minutes remaining
        });
      }
    }

    return result;
  }

  // Cleanup all data for a code
  async cleanupPair(code) {
    const pairKey = await this.generatePairKey(code);
    const linkKey = await this.generateLinkKey(code);
    const mobileKey = await this.generateMobileKey(code);
    
    const deleted = await this.client.del(pairKey, linkKey, mobileKey);
    return deleted;
  }

  // Reset all pairs and related data
  async resetAllPairs() {
    const pairKeys = await this.client.keys(`${this.PAIR_PREFIX}*`);
    const linkKeys = await this.client.keys(`${this.LINK_PREFIX}*`);
    const mobileKeys = await this.client.keys(`${this.MOBILE_PREFIX}*`);
    
    const allKeys = [...pairKeys, ...linkKeys, ...mobileKeys];
    
    if (allKeys.length > 0) {
      return this.client.del(...allKeys);
    }
    return 0;
  }
}

module.exports = new RedisService();
