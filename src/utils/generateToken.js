const crypto = require("crypto");

const generateToken = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

module.exports = generateToken;