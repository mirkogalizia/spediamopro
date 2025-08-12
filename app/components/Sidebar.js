"use client";

import { Drawer, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import BarChartIcon from "@mui/icons-material/BarChart"; // ⬅️ KPI
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Spedizioni", icon: <LocalShippingIcon fontSize="large" /> },
  { href: "/products/sales", label: "Stock", icon: <Inventory2Icon fontSize="large" /> },
  { href: "/kpi", label: "KPI", icon: <BarChartIcon fontSize="large" /> }, // ⬅️ Aggiunto
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <Drawer
      variant="permanent"
      PaperProps={{
        sx: {
          width: 82,
          bgcolor: "background.paper",
          borderRight: "1px solid #eee",
          boxShadow: 3,
        },
      }}
    >
      <List sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        {nav.map((item) => {
          const selected = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ width: "100%", textDecoration: "none" }}>
              <ListItem
                button
                selected={selected}
                sx={{
                  flexDirection: "column",
                  alignItems: "center",
                  py: 2,
                  borderRadius: 2,
                  color: selected ? "primary.main" : "text.secondary",
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "white",
                  },
                  transition: "background .2s, color .2s",
                  mb: 1,
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mb: 0.5, color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 12,
                    fontWeight: selected ? 700 : 500,
                    align: "center",
                  }}
                  sx={{ textAlign: "center" }}
                />
              </ListItem>
            </Link>
          );
        })}
      </List>
    </Drawer>
  );
}