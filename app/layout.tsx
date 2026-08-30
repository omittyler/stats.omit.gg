import './globals.css';

export const metadata = {
  title: 'stats.omit.gg',
  description: 'Call of Duty Challengers stats hub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
