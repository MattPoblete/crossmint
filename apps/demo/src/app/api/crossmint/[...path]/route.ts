import { NextRequest, NextResponse } from 'next/server';

const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY ?? process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? '';
const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

// Base URL without /api prefix - we'll include it in the path
const CROSSMINT_HOST =
  NETWORK === 'mainnet'
    ? 'https://www.crossmint.com'
    : 'https://staging.crossmint.com';

async function proxyRequest(request: NextRequest, path: string[]) {
  // The path comes as ['2022-06-09', 'wallets'] or ['v1-alpha2', 'wallets', 'stellar']
  // We prepend /api to build the full Crossmint URL
  const targetPath = path.join('/');
  const targetUrl = `${CROSSMINT_HOST}/api/${targetPath}`;

  // Also check for query params
  const searchParams = request.nextUrl.searchParams.toString();
  const fullUrl = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

  console.log('\n[Crossmint Proxy] ====================================');
  console.log('[Crossmint Proxy] Request:', {
    method: request.method,
    originalPath: path,
    targetUrl: fullUrl,
    hasApiKey: !!CROSSMINT_API_KEY,
    apiKeyPrefix: CROSSMINT_API_KEY ? CROSSMINT_API_KEY.substring(0, 15) + '...' : 'MISSING',
  });

  const headers: HeadersInit = {
    'X-API-KEY': CROSSMINT_API_KEY,
  };

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    body = await request.text();
    console.log('[Crossmint Proxy] Request body:', body);
  }

  try {
    const response = await fetch(fullUrl, {
      method: request.method,
      headers,
      body,
    });

    const data = await response.text();

    console.log('[Crossmint Proxy] Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('Content-Type'),
      body: data.length > 500 ? data.substring(0, 500) + '...' : data,
    });
    console.log('[Crossmint Proxy] ====================================\n');

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('[Crossmint Proxy] Error:', error);
    console.log('[Crossmint Proxy] ====================================\n');
    return NextResponse.json(
      { error: 'Failed to proxy request to Crossmint', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}
