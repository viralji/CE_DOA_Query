import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Development mode: Check for dev bypass flag
    if (isDevelopment && !token) {
      const devBypass = req.cookies.get('dev-bypass-auth')?.value === 'true';
      if (devBypass) {
        // Allow access in dev mode with bypass
        return NextResponse.next();
      }
    }

    // If no token, allow access to public pages only
    if (!token) {
      const isPublicAsset =
        pathname.startsWith('/icon-') ||
        pathname === '/apple-touch-icon.png' ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/api/auth') ||
        pathname === '/' ||
        pathname.startsWith('/signin');

      if (isPublicAsset) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/signin', req.url));
    }

    // For authenticated users, redirect root path to chat
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/chat', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        // Allow public pages and assets for unauthenticated users
        const isPublicAsset =
          pathname.startsWith('/icon-') ||
          pathname === '/apple-touch-icon.png' ||
          pathname.startsWith('/_next/') ||
          pathname.startsWith('/api/auth') ||
          pathname === '/' ||
          pathname.startsWith('/signin');

        if (isPublicAsset) {
          return true;
        }
        
        // In development, allow dev bypass
        if (isDevelopment && !token) {
          const devBypass = req.cookies.get('dev-bypass-auth')?.value === 'true';
          if (devBypass) {
            return true;
          }
        }
        
        // Require authentication for all other pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest|manifest.json|manifest.webmanifest|sw.js|icon-|apple-touch-icon).*)',
  ],
};
