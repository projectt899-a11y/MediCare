// The auth controller already defines and exports an Express router
// so re-export it here for `app.js` to mount at `/api/auth`.
module.exports = require('../controllers/authController');