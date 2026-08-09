import "./globals.css"

export const metadata = {
  title: "JMG Data & AI | Grupo Estar",
  description: "Asistente de gestión de Grupo Estar",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
