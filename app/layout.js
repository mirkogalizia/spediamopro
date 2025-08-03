"use client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Sidebar from "./components/Sidebar"; // Assicurati che il path sia corretto!

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#00c9a7",
    },
    background: {
      default: "#f5f5f7",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: [
      "Inter",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif"
    ].join(","),
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <main style={{ flex: 1, minHeight: "100vh", background: "#f5f5f7" }}>
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}