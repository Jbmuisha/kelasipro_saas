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
      <body>{children}</body>
    </html>
  );
}
