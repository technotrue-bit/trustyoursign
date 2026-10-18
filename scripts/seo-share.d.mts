export type ShareSource = {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  hasImageSize: boolean;
};

export declare function readShareSource(html: string): ShareSource;
export declare function rewriteShareHead(html: string): string;
export declare function createShareRewriter(): {
  push(chunk: Uint8Array | string): Uint8Array[];
  flush(): Uint8Array[];
};
