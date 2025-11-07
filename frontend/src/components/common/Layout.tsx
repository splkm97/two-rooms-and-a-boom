import { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Header() {
  return (
    <header
      style={{
        padding: '1rem',
        borderBottom: '1px solid #ccc',
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          margin: '0',
        }}
      >
        두개의 방, 한개의 폭탄
      </h1>
    </header>
  );
}

export function Footer() {
  return (
    <footer
      style={{
        padding: '1rem',
        borderTop: '1px solid #ccc',
        marginTop: 'auto',
        fontSize: 'clamp(0.8rem, 2vw, 1rem)',
      }}
    >
      <p style={{ margin: '0' }}>&copy; 2025 Two Rooms and a Boom</p>
    </footer>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main
        style={{
          flex: 1,
          padding: 'clamp(0.5rem, 3vw, 2rem)',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
