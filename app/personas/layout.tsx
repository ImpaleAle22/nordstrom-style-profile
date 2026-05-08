/**
 * Personas Page Layout
 * Isolates the profile UI from global Tailwind styles
 */

export default function PersonasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'block',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
    }}>
      {children}
    </div>
  );
}
