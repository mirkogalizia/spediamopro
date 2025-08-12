'use client';

import { usePathname } from 'next/navigation';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Sidebar from '@/components/Sidebar';
import './globals.css';

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
  const showSidebar = pathname !== '/'; // 👈 nasconde la sidebar SOLO in home/login
  const drawerWidth = 82; // = width del Drawer

  return (
    <html lang="it">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            {showSidebar && <Sidebar />}
<main style={{
              flex: 1,
              minHeight: '100vh',
              background: '#f5f5f7',
              paddingLeft: showSidebar ? drawerWidth : 0,
            }}>
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}