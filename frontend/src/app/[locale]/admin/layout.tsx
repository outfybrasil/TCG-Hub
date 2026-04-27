import React from 'react';
import AdminNav from '@/components/AdminNav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0c1324]">
      <AdminNav />
      <main className="flex-1 pl-72">
        {children}
      </main>
    </div>
  );
}
