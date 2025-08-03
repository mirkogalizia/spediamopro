// app/layout.tsx (o .js)
"use client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2", // blu MUI, cambia se vuoi!
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}