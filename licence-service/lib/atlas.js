// Minimal MongoDB Atlas Admin API client.
//
// Atlas programmatic API keys authenticate with HTTP Digest, which fetch does
// not do natively: the first request comes back 401 with a challenge, and the
// real request carries a hash derived from it. That handshake is implemented
// here rather than pulling in a dependency for ~40 lines.

const crypto = require('crypto');

const ATLAS_BASE = 'https://cloud.mongodb.com';
// Versioned media type required by the Atlas Admin API v2
const ACCEPT = 'application/vnd.atlas.2023-01-01+json';

const md5 = (value) => crypto.createHash('md5').update(value).digest('hex');

/** Pull key="value" (or key=value) pairs out of a WWW-Authenticate header. */
function parseChallenge(header) {
  const fields = {};
  const pattern = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
  let match;

  while ((match = pattern.exec(header)) !== null) {
    fields[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }

  return fields;
}

async function digestFetch(pathAndQuery, options = {}) {
  const publicKey = process.env.ATLAS_PUBLIC_KEY;
  const privateKey = process.env.ATLAS_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error('ATLAS_PUBLIC_KEY / ATLAS_PRIVATE_KEY are not configured');
  }

  const url = `${ATLAS_BASE}${pathAndQuery}`;
  const method = options.method || 'GET';
  const headers = { Accept: ACCEPT, ...options.headers };

  const challengeResponse = await fetch(url, { ...options, method, headers });

  // Some errors (bad path, no permission) come back without a challenge
  if (challengeResponse.status !== 401) return challengeResponse;

  const wwwAuthenticate = challengeResponse.headers.get('www-authenticate');
  if (!wwwAuthenticate) return challengeResponse;

  const { realm, nonce, qop, opaque } = parseChallenge(wwwAuthenticate);

  const ha1 = md5(`${publicKey}:${realm}:${privateKey}`);
  const ha2 = md5(`${method}:${pathAndQuery}`);
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const responseHash = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

  const authorization = [
    `Digest username="${publicKey}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${pathAndQuery}"`,
    `qop=${qop}`,
    `nc=${nc}`,
    `cnonce="${cnonce}"`,
    `response="${responseHash}"`,
    opaque ? `opaque="${opaque}"` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return fetch(url, {
    ...options,
    method,
    headers: { ...headers, Authorization: authorization },
  });
}

/**
 * Create a database user that can only touch `databaseName`.
 *
 * This scoping is what keeps customers out of each other's data: the
 * credentials end up on the customer's own machine, where they can always be
 * extracted, so they must grant nothing beyond that customer's database.
 */
async function createScopedUser({ username, password, databaseName }) {
  const groupId = process.env.ATLAS_PROJECT_ID;
  const clusterName = process.env.ATLAS_CLUSTER_NAME;

  if (!groupId || !clusterName) {
    throw new Error('ATLAS_PROJECT_ID / ATLAS_CLUSTER_NAME are not configured');
  }

  const response = await digestFetch(`/api/atlas/v2/groups/${groupId}/databaseUsers`, {
    method: 'POST',
    headers: { 'Content-Type': ACCEPT },
    body: JSON.stringify({
      databaseName: 'admin', // where the credential itself lives
      username,
      password,
      roles: [{ databaseName, roleName: 'readWrite' }],
      // Restrict the credential to this one cluster as well
      scopes: [{ name: clusterName, type: 'CLUSTER' }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Atlas user creation failed (${response.status}): ${detail}`);
  }

  return response.json();
}

/** Revoke access - used for refunds and chargebacks. */
async function deleteUser(username) {
  const groupId = process.env.ATLAS_PROJECT_ID;

  const response = await digestFetch(
    `/api/atlas/v2/groups/${groupId}/databaseUsers/admin/${encodeURIComponent(username)}`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Atlas user deletion failed (${response.status})`);
  }
}

/** Build the connection string handed to an activated desktop app. */
function connectionString({ username, password, databaseName }) {
  const host = process.env.ATLAS_CLUSTER_HOST;
  if (!host) throw new Error('ATLAS_CLUSTER_HOST is not configured');

  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/${databaseName}?retryWrites=true&w=majority`;
}

module.exports = { createScopedUser, deleteUser, connectionString, digestFetch };
