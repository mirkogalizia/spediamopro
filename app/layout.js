'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Sidebar from './components/Sidebar';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#00c9a7' },
    background: { default: '#f5f5f7' },
  },
  shape: { borderRadius: 16 },
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
            {showSidebar && (
              <aside className="w-64 border-r bg-white shadow-sm">
                <Sidebar />
              </aside>
            )}

            {/* MAIN CONTENT */}
            <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>

        </ThemeProvider>
      </body>
    </html>
  );
}