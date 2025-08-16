"use client";
import UploadVariants from "@/components/UploadVariants";
import { Card, CardContent, Typography } from "@mui/material";

export default function UploadPage() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      padding: "2rem",
      boxSizing: "border-box"
    }}>
      <Card
        elevation={6}
        sx={{
          minWidth: 400,
          maxWidth: 700,
          width: "100%",
          padding: "2rem",
          borderRadius: "16px",
        }}
      >
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">
            Upload Varianti CSV
          </Typography>
          <UploadVariants />
        </CardContent>
      </Card>
    </div>
  );
}