/**
 * Masks an API key for safe logging, telemetry, and client display.
 * E.g. "pg_pro_4d1e9a3b7c2" -> "pg_pro_••••••b7c2"
 *
 * @param {string} key
 * @returns {string}
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') {
    return '••••••••';
  }

  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }

  // Preserve prefix (e.g. "pg_pro_") and last 4 characters
  const parts = trimmed.split('_');
  if (parts.length >= 2) {
    const prefix = `${parts[0]}_${parts[1]}_`;
    const tail = trimmed.slice(-4);
    return `${prefix}••••••${tail}`;
  }

  return `${trimmed.slice(0, 4)}••••••${trimmed.slice(-4)}`;
}

module.exports = maskApiKey;

