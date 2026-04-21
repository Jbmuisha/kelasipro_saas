// app/layout.tsx
import "../styles/global.css"; // chemin relatif correct

export const metadata = {
  title: "KelasiPro",
  description: "Plateforme scolaire multi-établissements",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
