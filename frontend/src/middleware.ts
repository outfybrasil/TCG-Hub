import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  matcher: [
    // Match root and all locale-prefixed paths
    '/',
    '/(pt|en|es|it|de|fr)/:path*',
    // Match all paths that are NOT _next, api, or static files
    '/((?!api|_next/static|_next/image|favicon.ico|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico)).*)'
  ]
};
