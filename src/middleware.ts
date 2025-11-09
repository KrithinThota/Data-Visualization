import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for request optimization and performance
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Performance and security headers
  const headers = new Headers(response.headers);
  
  // Enable DNS prefetching
  headers.set('X-DNS-Prefetch-Control', 'on');
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Caching strategy based on path
  const pathname = request.nextUrl.pathname;
  
  // Static assets - aggressive caching
  if (pathname.startsWith('/workers/') || pathname.startsWith('/_next/static/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // API routes - no cache for real-time data
  else if (pathname.startsWith('/api/data/')) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
  }
  
  // Config routes - cache for 5 minutes
  else if (pathname.startsWith('/api/config/')) {
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  }
  
  // Regular pages - stale-while-revalidate
  else if (!pathname.startsWith('/api/')) {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }
  
  // Compression hint
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  if (acceptEncoding.includes('br')) {
    headers.set('Content-Encoding', 'br');
  } else if (acceptEncoding.includes('gzip')) {
    headers.set('Content-Encoding', 'gzip');
  }
  
  // Early hints for resource loading (workers only - critical resources)
  headers.set('Link', [
    '</workers/data-processor.worker.js>; rel=preload; as=worker',
    '</workers/canvas-renderer.worker.js>; rel=preload; as=worker'
  ].join(', '));
  
  // Vary header for proper caching
  headers.set('Vary', 'Accept-Encoding');
  
  return NextResponse.next({
    request: {
      headers: request.headers
    },
    headers
  });
}

/**
 * Configure which paths middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/image|favicon.ico|.*\\.svg$).*)',
  ],
};