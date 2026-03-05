'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is obsolete and redirects to the new single-page app root.
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return null;
}
