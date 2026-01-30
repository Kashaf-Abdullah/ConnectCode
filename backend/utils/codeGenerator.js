const shortid = require('shortid');

class CodeGenerator {
  static generate() {
    // Generate code and filter out non-alphanumeric characters
    // Keep generating until we have exactly 6 alphanumeric characters
    let code = '';
    let attempts = 0;
    const maxAttempts = 50;
    
    while (code.length < 6 && attempts < maxAttempts) {
      const generated = shortid.generate().toUpperCase();
      // Filter to only alphanumeric characters
      const alphanumeric = generated.replace(/[^A-Z0-9]/g, '');
      code += alphanumeric;
      attempts++;
      
      // If we have enough characters, break
      if (code.length >= 6) {
        break;
      }
    }
    
    // Ensure we have exactly 6 characters, pad if needed
    if (code.length < 6) {
      // If somehow we don't have 6 chars, pad with random alphanumeric
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      while (code.length < 6) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    // Return exactly 6 alphanumeric characters
    return code.slice(0, 6);
  }
  
  static isValidFormat(code) {
    // Validate exactly 6 alphanumeric characters
    return /^[A-Z0-9]{6}$/.test(code);
  }
}

module.exports = CodeGenerator;

