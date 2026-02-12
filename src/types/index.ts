// Authentication types
export interface AuthSession {
  cookies: Record<string, string>;
  user_id: string | null;
  expires_at: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  session: AuthSession | null;
}

// Stream types
export type StreamStatus = "live" | "upcoming" | "ended" | "replay";

export interface OlympicStream {
  id: string;
  title: string;
  description: string;
  sport: string;
  status: StreamStatus;
  start_time: string;
  end_time: string | null;
  thumbnail_url: string;
  stream_url: string;
  requires_auth: boolean;
  is_premium: boolean;
}

// Viewport types
export interface ViewportState {
  index: number;
  stream: OlympicStream | null;
  // isLoading: boolean;
  error: string | null;
  volume: number;
}

// Audio types
export interface AudioState {
  activeViewportIndex: number;
  masterVolume: number;
  isMuted: boolean;
}

// Stream manifest types
export interface BitrateInfo {
  bitrate: number;
  width: number;
  height: number;
  lines: string;
}

export interface StreamManifest {
  url: string;
  error_code: number;
  message: string | null;
  bitrates: BitrateInfo[];
}

// App settings
export interface AppSettings {
  refreshInterval: number; // in milliseconds
}
