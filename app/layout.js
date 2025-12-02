import './globals.css';
import Sidebar from './components/Sidebar';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <RootContent>{children}</RootContent>
      </body>
    </html>
  );
}

function RootContent({ children }: { children: React.ReactNode }) {
  'use client';
  
  const pathname = usePathname();
  const showSidebar = pathname !== '/';

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      {/* SIDEBAR */}
      {showSidebar && (
        <aside className="fixed left-0 top-0 h-full w-64 shadow-md bg-white z-50">
          <Sidebar />
        </aside>
      )}

      {/* CONTENT */}
      <main className={`flex-1 transition-all ${showSidebar ? 'ml-64' : ''}`}>
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
