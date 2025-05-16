declare module 'pinata' {
  export interface PinataConfig {
    pinataJwt: string;
    pinataGateway?: string;
    customHeaders?: Record<string, string>;
  }

  export interface UploadResponse {
    id: string;
    name: string;
    cid: string;
    size: number;
    number_of_files: number;
    mime_type: string;
    user_id: string;
    group_id: string | null;
  }

  export interface MetadataOptions {
    name: string;
    keyvalues: Record<string, string>;
  }

  export interface ImageOptimizationOptions {
    width?: number;
    height?: number;
    format?: "auto" | "webp";
  }

  interface UploadPublic {
    file: (file: any) => {
      group: (groupId: string) => any;
      addMetadata: (metadata: MetadataOptions) => Promise<UploadResponse>;
      key: (apiKey: string) => any;
    };
    json: (json: any) => {
      addMetadata: (metadata: MetadataOptions) => Promise<UploadResponse>;
    };
    base64: (base64: string) => any;
    url: (url: string) => any;
  }

  interface Upload {
    public: UploadPublic;
  }

  interface GatewaysPublic {
    convert: (cid: string) => Promise<string>;
  }

  interface Gateways {
    public: GatewaysPublic;
    get: (cid: string) => {
      optimizeImage: (options: ImageOptimizationOptions) => any;
    };
    createSignedURL: (options: { cid: string; expires: number }) => Promise<string>;
  }

  export class PinataSDK {
    constructor(config: PinataConfig);

    upload: Upload;
    gateways: Gateways;
    testAuthentication: () => Promise<{ message: string }>;
  }
} 