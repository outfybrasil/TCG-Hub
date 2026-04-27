import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  locales: ['pt', 'en', 'es', 'it', 'de', 'fr'],
  defaultLocale: 'pt',
  localePrefix: 'as-needed'
});
 
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
