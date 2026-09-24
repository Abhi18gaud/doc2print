import { redirect } from 'next/navigation';

export default async function CustomerRootPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; slug?: string; id?: string }>;
}) {
  const params = await searchParams;
  const target = params.shop || params.slug || params.id || 'counter';
  redirect(`/kiosk/${encodeURIComponent(target)}`);
}
