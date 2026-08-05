import React from 'react';
import AdminNav from '@/components/AdminNav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-0 bg-[#0c1324]">
      <AdminNav />
      <main className="min-w-0 flex-1 lg:pl-72">
        {children}
      </main>
    </div>
  );
}
