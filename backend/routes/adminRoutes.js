const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const redisService = require('../services/redisService..js');

// Get admin dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const activePairs = await redisService.getActivePairs();
    
    res.json({
      success: true,
      data: {
        activeCodesCount: activePairs.length,
        activeCodes: activePairs.map(pair => ({
          code: pair.code,
          expiresIn: pair.expiresIn,
          hasMobile: !!pair.mobileSocketId,
          hasLink: !!pair.link,
          link: pair.link || null
        }))
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
});

// Reset all codes (requires admin password)
router.post('/reset-codes', adminAuth, async (req, res) => {
  try {
    const deletedCount = await redisService.resetAllPairs();
    
    res.json({
      success: true,
      message: `Reset successful. Deleted ${deletedCount} entries.`,
      deletedCount
    });
  } catch (error) {
    console.error('Error resetting codes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset codes'
    });
  }
});

module.exports = router;

