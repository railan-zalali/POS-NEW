import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="flex min-h-screen bg-muted/40">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main
            id="main-content"
            className="flex-1 p-4 md:p-6 overflow-auto"
            role="main"
            aria-label="Main content area"
          >
            <Outlet />
          </main>
          <footer className="border-t bg-card px-6 py-4" role="contentinfo">
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} Toko Tani Makmur. Hak Cipta Dilindungi.
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
