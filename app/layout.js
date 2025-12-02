import './globals.css';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Sidebar from './components/Sidebar';
import { usePathname } from 'next/navigation';

export const metadata = {
  title: 'SpediamoPro Dashboard',
  description: 'Gestione avanzata spedizioni + produzione + blanks',
};

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#00c9a7' },
    background: { default: '#f5f5f7' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'Inter',
      'Montserrat',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// ⛔️ NOTA: layout MUST be SERVER COMPONENT
export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LayoutClient>{children}</LayoutClient>
        </ThemeProvider>
      </body>
    </html>
  );
}

// 🔥 Client wrapper SOLO per sidebar e pathname
function LayoutClient({ children }) {
  const pathname = usePathname();
  const showSidebar = pathname !== '/';

  return (
    <div className="flex min-h-screen w-full bg-gray-50">

      {/* SIDEBAR FIX */}
      {showSidebar && (
        <aside className="fixed left-0 top-0 h-full w-64 shadow-md bg-white z-50">
          <Sidebar />
        </aside>
      )}

      {/* MAIN CONTENT */}
      <main className={`flex-1 ${showSidebar ? 'ml-64' : ''}`}>
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}