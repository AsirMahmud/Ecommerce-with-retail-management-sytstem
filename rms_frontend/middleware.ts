import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Fast-path bypass for Next internals, API calls, and static files (.json, .js, images, icons)
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/manifest.json' ||
        pathname === '/sw.js' ||
        pathname === '/offline.html' ||
        pathname === '/favicon.ico' ||
        pathname.startsWith('/icons/') ||
        pathname.startsWith('/images/') ||
        pathname.startsWith('/torongox-logo') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;
    const refreshToken = request.cookies.get('refreshToken')?.value;

    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

    // If completely unauthenticated and trying to access a protected route
    if (!token && !refreshToken && !isPublicPath) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If has access token, check expiration
    if (token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const isExpired = payload.exp && payload.exp * 1000 < Date.now();

                // If access token expired and no refresh token exists, redirect to login
                if (isExpired && !refreshToken) {
                    const response = NextResponse.redirect(new URL('/login', request.url));
                    response.cookies.delete('token');
                    return response;
                }
            }

            // If user is authenticated and visits /login, redirect to home
            if (isPublicPath && pathname.startsWith('/login') && !refreshToken) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        } catch {
            if (!refreshToken) {
                const response = NextResponse.redirect(new URL('/login', request.url));
                response.cookies.delete('token');
                return response;
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};