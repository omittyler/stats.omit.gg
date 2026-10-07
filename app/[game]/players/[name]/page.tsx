import { playerParams } from '@/lib/staticParams';

export { default, generateMetadata } from '@/app/players/[name]/page';

export const dynamicParams = false;
export const generateStaticParams = playerParams;
