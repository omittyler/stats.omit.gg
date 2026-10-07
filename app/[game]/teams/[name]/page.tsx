import { teamParams } from '@/lib/staticParams';

export { default, generateMetadata } from '@/app/teams/[name]/page';

export const dynamicParams = false;
export const generateStaticParams = teamParams;
