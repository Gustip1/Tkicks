import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerProfile } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Admin - Tkicks'
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await getServerProfile();
  if (!user || profile?.role !== 'admin') redirect('/');
  
  return <AdminShell>{children}</AdminShell>;
}


