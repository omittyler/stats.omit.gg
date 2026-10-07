import { eventParams, type ParentParams } from '@/lib/staticParams';

export { default, generateMetadata } from '@/app/events/[name]/bracket/page';

export const dynamicParams = false;

export function generateStaticParams(parent: ParentParams) {
  return eventParams(parent, { withRegion: false, bracketOnly: true });
}
