const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

const adminAuth = (req, res, next) => {
  const { pass } = req.body;
  if (pass !== ADMIN_PASS) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Invalid admin password' 
    });
  }
  next();
};

module.exports = adminAuth;

