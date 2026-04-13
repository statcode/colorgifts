import { logger } from "./logger";

const LULU_SANDBOX_BASE = "https://api.sandbox.lulu.com";
const LULU_PROD_BASE = "https://api.lulu.com";
const LULU_AUTH_URL = "https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token";
const LULU_SANDBOX_AUTH_URL = "https://api.sandbox.lulu.com/auth/realms/glasstree/protocol/openid-connect/token";

export const COLORING_BOOK_POD_PACKAGE_ID = "0850X1100.BW.STD.PB.060UW444.MXX";

function getLuluBaseUrl(): string {
  return process.env.LULU_SANDBOX === "false" ? LULU_PROD_BASE : LULU_SANDBOX_BASE;
}

function getLuluAuthUrl(): string {
  return process.env.LULU_SANDBOX === "false" ? LULU_AUTH_URL : LULU_SANDBOX_AUTH_URL;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export async function getLuluAccessToken(): Promise<string> {
  const clientKey = process.env.LULU_CLIENT_KEY;
  const clientSecret = process.env.LULU_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error(
      "Lulu API credentials not configured. Please set LULU_CLIENT_KEY and LULU_CLIENT_SECRET environment variables."
    );
  }

  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${clientKey}:${clientSecret}`).toString("base64");

  const response = await fetch(getLuluAuthUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Lulu authentication failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const expiresIn = (data.expires_in ?? 3600) - 60;
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  logger.info("Lulu access token refreshed");
  return tokenCache.token;
}

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  postcode: string;
  phone_number: string;
  email: string;
  is_business?: boolean;
}

export type ShippingLevel = "MAIL" | "PRIORITY_MAIL" | "GROUND" | "EXPEDITED" | "EXPRESS";

export interface CreatePrintJobParams {
  bookTitle: string;
  externalId?: string;
  interiorPdfUrl: string;
  coverPdfUrl: string;
  pageCount: number;
  shippingAddress: ShippingAddress;
  contactEmail: string;
  shippingLevel: ShippingLevel;
}

export interface PrintJob {
  id: number;
  status: {
    name: string;
    message?: string;
    changed?: string;
  };
  costs?: {
    total_cost_incl_tax?: string;
    total_cost_excl_tax?: string;
    shipping_cost?: {
      total_cost_incl_tax?: string;
    };
  };
  shipping_address: ShippingAddress;
  estimated_shipping_dates?: {
    arrival_min?: string;
    arrival_max?: string;
    dispatch_min?: string;
    dispatch_max?: string;
  };
  line_items?: Array<{
    id: number;
    tracking_id?: string;
    tracking_urls?: string[];
    carrier_name?: string;
    status?: { name: string };
  }>;
}

export async function createLuluPrintJob(params: CreatePrintJobParams): Promise<PrintJob> {
  const token = await getLuluAccessToken();
  const base = getLuluBaseUrl();

  const body = {
    contact_email: params.contactEmail,
    external_id: params.externalId,
    production_delay: 60,
    shipping_level: params.shippingLevel,
    shipping_address: params.shippingAddress,
    line_items: [
      {
        title: params.bookTitle,
        pod_package_id: COLORING_BOOK_POD_PACKAGE_ID,
        quantity: 1,
        interior: {
          source_url: params.interiorPdfUrl,
        },
        cover: {
          source_url: params.coverPdfUrl,
        },
      },
    ],
  };

  logger.info({ base, externalId: params.externalId }, "Creating Lulu print job");

  const response = await fetch(`${base}/print-jobs/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, errorBody }, "Lulu print job creation failed");
    throw new Error(`Lulu print job creation failed: ${response.status} ${errorBody}`);
  }

  const printJob = await response.json();
  logger.info({ printJobId: printJob.id }, "Lulu print job created");
  return printJob;
}

export async function getLuluPrintJobStatus(printJobId: string): Promise<{ name: string; message?: string; changed?: string; lineItemStatuses?: unknown[] }> {
  const token = await getLuluAccessToken();
  const base = getLuluBaseUrl();

  const response = await fetch(`${base}/print-jobs/${printJobId}/status/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get Lulu print job status: ${response.status} ${errorBody}`);
  }

  return response.json();
}

export async function getLuluPrintJob(printJobId: string): Promise<PrintJob> {
  const token = await getLuluAccessToken();
  const base = getLuluBaseUrl();

  const response = await fetch(`${base}/print-jobs/${printJobId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get Lulu print job: ${response.status} ${errorBody}`);
  }

  return response.json();
}

export interface CoverDimensions {
  width: number;
  height: number;
  unit: string;
  safe_zone: number;
  bleed: number;
  spine_width: number;
}

export async function getLuluCoverDimensions(pageCount: number): Promise<CoverDimensions> {
  const token = await getLuluAccessToken();
  const base = getLuluBaseUrl();

  const body = {
    interior_page_count: pageCount,
    pod_package_id: COLORING_BOOK_POD_PACKAGE_ID,
    unit: "PT",
  };

  const response = await fetch(`${base}/cover-dimensions/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get Lulu cover dimensions: ${response.status} ${errorBody}`);
  }

  return response.json();
}

export interface CostCalculation {
  total_cost_excl_tax: string;
  total_cost_incl_tax: string;
  total_tax: string;
  currency: string;
  shipping_cost: {
    total_cost_excl_tax: string;
    total_cost_incl_tax: string;
    total_tax: string;
  };
  line_item_costs: Array<{
    quantity: number;
    total_cost_excl_tax: string;
    total_cost_incl_tax: string;
  }>;
}

export async function calculateLuluCost(
  pageCount: number,
  shippingAddress: ShippingAddress,
  shippingLevel: ShippingLevel
): Promise<CostCalculation> {
  const token = await getLuluAccessToken();
  const base = getLuluBaseUrl();

  const body = {
    line_items: [
      {
        pod_package_id: COLORING_BOOK_POD_PACKAGE_ID,
        page_count: pageCount,
        quantity: 1,
      },
    ],
    shipping_address: shippingAddress,
    shipping_option: shippingLevel,
  };

  const response = await fetch(`${base}/print-job-cost-calculations/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to calculate Lulu cost: ${response.status} ${errorBody}`);
  }

  return response.json();
}
