const express = require('express');
const router = express.Router();
const PairingController = require('../controllers/pairingController');

// Initialize controller with io (will be set after server starts)
let pairingController;

const initializePairingRoutes = (io) => {
  pairingController = new PairingController(io);
  
  // Generate code for desktop
  router.get('/generate-code', (req, res) => pairingController.generateCode(req, res));
  
  // Validate code from mobile
  router.post('/validate-code', (req, res) => pairingController.validateCode(req, res));
  
  // Submit link from mobile
  router.post('/submit-link', (req, res) => pairingController.submitLink(req, res));
  
  // Get all active codes (for admin)
  router.get('/active-codes', (req, res) => pairingController.getActiveCodes(req, res));
};

module.exports = { router, initializePairingRoutes };

