import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/manifest.json',
    '/sw.js',
    '/offline.html',
    '/icons',
    '/images',
    '/torongox-logo',
    '/favicon.ico',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token')?.value;

    // Check if the current path is public
    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

    // If no token and trying to access protected route, redirect to login
    if (!token && !isPublicPath) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If has token, do basic expiration check
    if (token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const isExpired = payload.exp && payload.exp * 1000 < Date.now();

                if (isExpired) {
                    const response = NextResponse.redirect(new URL('/login', request.url));
                    response.cookies.delete('token');
                    return response;
                }
            }

            // If authenticated user tries to access login, redirect to dashboard
            if (isPublicPath && pathname.startsWith('/login')) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        } catch {
            // Invalid token, clear and redirect
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('token');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|icons|images|torongox-logo|api).*)',
    ],
};