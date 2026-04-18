
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{
    returnTo?: string | string[]
  }>
}) {
  const resolvedSearchParams = await searchParams;
  const returnTo = Array.isArray(resolvedSearchParams.returnTo) ? resolvedSearchParams.returnTo[0] : resolvedSearchParams.returnTo || '/login';
  redirect(returnTo);
}

