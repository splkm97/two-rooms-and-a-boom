import { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Header() {
  return (
    <header style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <h1>두개의 방, 한개의 폭탄</h1>
    </header>
  );
}

export function Footer() {
  return (
    <footer style={{ padding: '1rem', borderTop: '1px solid #ccc', marginTop: 'auto' }}>
      <p>&copy; 2025 Two Rooms and a Boom</p>
    </footer>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
      <Footer />
    </div>
  );
}
