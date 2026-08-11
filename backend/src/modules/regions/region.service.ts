import { ApplicationError } from '@/shared/errors/application-error';

export type RegionOption = {
  code: string;
  name: string;
};

type ExternalRegionRecord = {
  code?: unknown;
  name?: unknown;
  kode_wilayah?: unknown;
  nama_wilayah?: unknown;
};

type ExternalRegionPayload = {
  data?: unknown;
};

const primaryApi = 'https://wilayah.web.id/api';
const fallbackApi = 'https://api.datawilayah.com/api';
const requestTimeoutMs = 5000;

function normalizeOptions(payload: unknown): RegionOption[] {
  if (!payload || typeof payload !== 'object') return [];

  const data = (payload as ExternalRegionPayload).data;
  if (!Array.isArray(data)) return [];

  return data.flatMap((item): RegionOption[] => {
    if (!item || typeof item !== 'object') return [];

    const record = item as ExternalRegionRecord;
    const code = String(record.code ?? record.kode_wilayah ?? '').trim();
    const name = String(record.name ?? record.nama_wilayah ?? '').trim();

    return code && name ? [{ code, name }] : [];
  });
}

async function fetchOptions(url: string): Promise<RegionOption[]> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) throw new Error(`Region provider returned ${response.status}`);

  const options = normalizeOptions(await response.json());
  if (options.length === 0) throw new Error('Region provider returned no options');

  return options;
}

async function fetchWithFallback(primaryUrl: string, fallbackUrl: string): Promise<RegionOption[]> {
  try {
    return await fetchOptions(primaryUrl);
  } catch {
    try {
      return await fetchOptions(fallbackUrl);
    } catch {
      throw new ApplicationError({
        code: 'INTERNAL_ERROR',
        message: 'Region providers are unavailable',
        safeMessage: 'Data wilayah sedang tidak tersedia. Silakan coba lagi.',
        statusCode: 503,
      });
    }
  }
}

export async function listPublicProvinces(): Promise<RegionOption[]> {
  return fetchWithFallback(
    `${primaryApi}/provinces?limit=100&page=1`,
    `${fallbackApi}/provinsi.json`,
  );
}

export async function listPublicRegencies(provinceCode: string): Promise<RegionOption[]> {
  if (!/^\d{2}$/.test(provinceCode)) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Invalid province code',
      safeMessage: 'Kode provinsi tidak valid.',
      statusCode: 400,
    });
  }

  return fetchWithFallback(
    `${primaryApi}/regencies/${provinceCode}?limit=100&page=1`,
    `${fallbackApi}/kabupaten_kota/${provinceCode}.json`,
  );
}
