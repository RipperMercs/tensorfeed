import type { Metadata } from 'next';
import IsServiceDown from '@/components/IsServiceDown';
import { IS_DOWN_SERVICES, buildIsDownMetadata } from '@/lib/is-down-services';

const SERVICE = IS_DOWN_SERVICES['azure-openai'];

export const metadata: Metadata = buildIsDownMetadata(SERVICE);

export default function Page() {
  return <IsServiceDown service={SERVICE} />;
}
