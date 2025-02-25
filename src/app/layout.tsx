import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Luma API Sequencer by West Coast AI Labs</title>
        <meta name="description" content="A simple interface for interacting with the Luma Labs API." />
      </head>
      <body className="bg-black">
        {children}
      </body>
    </html>
  );
}
