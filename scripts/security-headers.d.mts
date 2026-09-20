export declare const CONTENT_SECURITY_POLICY: string;
export declare const STRICT_TRANSPORT_SECURITY: string;
export declare const REFERRER_POLICY: string;
export declare const PERMISSIONS_POLICY: string;
export declare const SECURITY_HEADERS: Readonly<Record<string, string>>;
export declare const SECURITY_HEADER_NAMES: readonly string[];

export declare function applySecurityHeaders(
  headers: {
    set(name: string, value: string): void;
    get?(name: string): string | null | undefined;
  },
  opts?: { overwrite?: boolean },
): void;

export declare function withSecurityHeaders(result: unknown): unknown;
