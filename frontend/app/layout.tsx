import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'MessageHub',
  description:
    'Your central hub for sending messages to multiple Telegram groups',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
