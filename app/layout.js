'use client';

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
  const showSidebar = pathname !== '/'; // 👈 mostra sidebar solo se non sei in home/login

  return (
    <html lang="it">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
            {showSidebar && (
              <div style={{ width: 256 }}>
                <Sidebar />
              </div>
            )}
            <main
              style={{
                flex: 1,
                background: '#f5f5f7',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // 👈 centra tutto orizzontalmente
                justifyContent: 'center', // 👈 centra tutto verticalmente
              }}
            >
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}