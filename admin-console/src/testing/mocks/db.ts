import { factory, primaryKey, manyOf } from '@mswjs/data';

export const db = factory({
  tenant: {
    id: primaryKey(String),
    name: String,
    displayName: String,
    enabled: Boolean,
    createdAt: Number,
  },
  role: {
    id: primaryKey(String),
    tenantId: String,
    name: String,
    description: String,
    createdAt: Number,
  },
  client: {
    id: primaryKey(String),
    tenantId: String,
    clientId: String,
    name: String,
    description: String,
    enabled: Boolean,
    publicClient: Boolean,
    secret: String,
    rootUrl: String,
    homeUrl: String,
    // @mswjs/data has no array field type, so list fields are stored as JSON strings.
    redirectUrisJson: String,
    postLogoutRedirectUrisJson: String,
    defaultScopesJson: String,
    directAccessGrants: Boolean,
    serviceAccounts: Boolean,
    implicitFlow: Boolean,
    deviceFlow: Boolean,
    pkce: String,
    consentRequired: Boolean,
    accessTokenLifespan: Number,
    idTokenSignatureAlg: String,
    fullScopeAllowed: Boolean,
    createdAt: Number,
  },
  user: {
    id: primaryKey(String),
    tenantId: String,
    username: String,
    email: String,
    firstName: String,
    lastName: String,
    enabled: Boolean,
    createdAt: Number,
    roles: manyOf('role'),
  },
  adminUser: {
    id: primaryKey(String),
    username: String,
    email: String,
    password: String,
  },
});

// Monotonic, so ids/timestamps stay deterministic across test runs.
let seq = 0;
export const uid = (prefix: string): string => {
  seq += 1;
  return `${prefix}_${seq}`;
};

let secretSeq = 0;
export const genSecret = (): string => {
  secretSeq += 1;
  const a = ((secretSeq * 2654435761) >>> 0).toString(16).padStart(8, '0');
  const b = ((secretSeq * 40503) >>> 0).toString(16).padStart(8, '0');
  return `cs_${a}${b}${a}`.slice(0, 35);
};

let clock = 1_700_000_000_000;
const nextTime = () => (clock += 1000);

// Stands in for the httpOnly auth cookie the mock would otherwise set.
let currentAdminId: string | null = null;
export const session = {
  get: () => currentAdminId,
  set: (id: string | null) => {
    currentAdminId = id;
  },
};

function drain() {
  db.user.deleteMany({ where: {} });
  db.client.deleteMany({ where: {} });
  db.role.deleteMany({ where: {} });
  db.tenant.deleteMany({ where: {} });
  db.adminUser.deleteMany({ where: {} });
}

export function seedDb() {
  drain();
  currentAdminId = null;
  seq = 0;
  secretSeq = 0;
  clock = 1_700_000_000_000;

  db.adminUser.create({
    id: 'admin-1',
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin',
  });

  const tenants = [
    { name: 'system', displayName: 'System', enabled: true },
    { name: 'acme', displayName: 'Acme Corp', enabled: true },
  ].map((r) => db.tenant.create({ id: uid('tenant'), createdAt: nextTime(), ...r }));

  const acme = tenants[1]!;

  const roles = [
    { name: 'admin', description: 'Full administrative access' },
    { name: 'developer', description: 'Manage clients and configuration' },
    { name: 'viewer', description: 'Read-only access' },
  ].map((role) =>
    db.role.create({ id: uid('role'), tenantId: acme.id, createdAt: nextTime(), ...role }),
  );

  db.client.create({
    id: uid('client'),
    tenantId: acme.id,
    clientId: 'account-console',
    name: 'Account Console',
    description: 'Built-in account management client',
    enabled: true,
    publicClient: true,
    secret: '',
    rootUrl: 'https://acme.example.com',
    homeUrl: 'https://acme.example.com/account',
    redirectUrisJson: JSON.stringify(['https://acme.example.com/account/*']),
    postLogoutRedirectUrisJson: JSON.stringify(['https://acme.example.com']),
    defaultScopesJson: JSON.stringify(['openid', 'profile', 'email']),
    directAccessGrants: false,
    serviceAccounts: false,
    implicitFlow: false,
    deviceFlow: false,
    pkce: 'S256',
    consentRequired: false,
    accessTokenLifespan: 300,
    idTokenSignatureAlg: 'RS256',
    fullScopeAllowed: false,
    createdAt: nextTime(),
  });
  db.client.create({
    id: uid('client'),
    tenantId: acme.id,
    clientId: 'backend-api',
    name: 'Backend API',
    description: 'Confidential service client',
    enabled: true,
    publicClient: false,
    secret: genSecret(),
    rootUrl: '',
    homeUrl: '',
    redirectUrisJson: JSON.stringify(['https://api.acme.example.com/callback']),
    postLogoutRedirectUrisJson: JSON.stringify([]),
    defaultScopesJson: JSON.stringify(['openid', 'roles']),
    directAccessGrants: true,
    serviceAccounts: true,
    implicitFlow: false,
    deviceFlow: false,
    pkce: 'none',
    consentRequired: false,
    accessTokenLifespan: 600,
    idTokenSignatureAlg: 'RS256',
    fullScopeAllowed: true,
    createdAt: nextTime(),
  });

  db.user.create({
    id: uid('user'),
    tenantId: acme.id,
    username: 'jdoe',
    email: 'jdoe@acme.example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    enabled: true,
    createdAt: nextTime(),
    roles: [roles[0]!, roles[2]!],
  });
  db.user.create({
    id: uid('user'),
    tenantId: acme.id,
    username: 'msmith',
    email: 'msmith@acme.example.com',
    firstName: 'Mark',
    lastName: 'Smith',
    enabled: false,
    createdAt: nextTime(),
    roles: [roles[1]!],
  });
}
