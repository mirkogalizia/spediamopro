'use client';

import './globals.css';
import Sidebar from './components/Sidebar';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <RootContent>{children}</RootContent>
      </body>
    </html>
  );
}

function RootContent({ children }) {
  const pathname = usePathname();

  // Sidebar nascosta in home (/) e in /shipment3
  const hideSidebarRoutes = ['/', '/shipment3'];
  const showSidebar = !hideSidebarRoutes.includes(pathname);

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      {/* SIDEBAR */}
      {showSidebar && (
        <aside className="fixed left-0 top-0 h-full w-20 shadow-md bg-white z-50">
          <Sidebar />
        </aside>
      )}

      {/* CONTENT */}
      <main className={`flex-1 transition-all ${showSidebar ? 'ml-20' : ''}`}>
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
