/**
 * Sidecar Types
 *
 * Types for the brain-side sidecar management system.
 */

/** Capabilities a sidecar can advertise */
export type SidecarCapability =
  | 'terminal'
  | 'filesystem'
  | 'desktop'
  | 'browser'
  | 'clipboard'
  | 'screenshot'
  | 'system_info'
  | 'awareness';

/** Sidecar status in the database */
export type SidecarStatus = 'enrolled' | 'revoked';

/** Sidecar record as stored in the database */
export interface SidecarRecord {
  id: string;
  name: string;
  token_id: string;
  enrolled_at: string;
  last_seen_at: string | null;
  status: SidecarStatus;
  /** Populated after first connection */
  hostname: string | null;
  os: string | null;
  platform: string | null;
  /** JSON-encoded SidecarCapability[] — populated after first connection */
  capabilities: string | null;
}

/** JWT claims for a sidecar enrollment token */
export interface SidecarTokenClaims {
  /** Subject: "sidecar:<id>" */
  sub: string;
  /** Unique token ID (for revocation tracking) */
  jti: string;
  /** Sidecar UUID */
  sid: string;
  /** Human-readable sidecar name */
  name: string;
  /** WebSocket URL for the sidecar to connect to */
  brain: string;
  /** URL to fetch the brain's JWKS public key */
  jwks: string;
  /** Issued-at timestamp */
  iat: number;
}

/** Registration message sent by sidecar on WebSocket connect */
export interface SidecarRegistration {
  type: 'register';
  hostname: string;
  os: string;
  platform: string;
  capabilities: SidecarCapability[];
}

/** A connected sidecar (runtime state, not persisted) */
export interface ConnectedSidecar {
  id: string;
  name: string;
  hostname: string;
  os: string;
  platform: string;
  capabilities: SidecarCapability[];
  connectedAt: Date;
}

/** Sidecar info returned by API (DB record + connection state) */
export interface SidecarInfo {
  id: string;
  name: string;
  enrolled_at: string;
  last_seen_at: string | null;
  status: SidecarStatus;
  connected: boolean;
  hostname?: string;
  os?: string;
  platform?: string;
  capabilities?: SidecarCapability[];
}
