import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Video Generator</title>
        <meta name="description" content="Generate videos from text prompts" />
      </head>
      <body className="bg-black">
        {children}
      </body>
    </html>
  );
}
