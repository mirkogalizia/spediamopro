'use client';

import './globals.css';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Sidebar from './components/Sidebar';
import { usePathname } from 'next/navigation';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#00c9a7' },
    background: { default: '#f5f5f7' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: ['Inter', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'].join(','),
  },
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const showSidebar = pathname !== '/';

  return (
    <html lang="it">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />

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

        </ThemeProvider>
      </body>
    </html>
  );
}