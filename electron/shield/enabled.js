/** Runtime toggle for Encryptic Shield request blocking (renderer syncs via IPC). */
let shieldEnabled = true;

function isShieldEnabled() {
  return shieldEnabled;
}

function setShieldEnabled(value) {
  shieldEnabled = value !== false;
  return shieldEnabled;
}

module.exports = { isShieldEnabled, setShieldEnabled };
