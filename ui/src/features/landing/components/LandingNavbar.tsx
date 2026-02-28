import { Github, Menu, Shield, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleRouteNavigation = (route: string) => {
    navigate(route);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="absolute top-0 z-50 w-full border-b border-border-color-dark/50 bg-bg-main-dark/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <button
            type="button"
            className="group inline-flex items-center space-x-2"
            onClick={() => handleRouteNavigation("/home")}
          >
            <Shield className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
            <span className="text-lg font-bold tracking-tight text-white sm:text-xl">
              Monkeys <span className="text-primary">IAM</span>
            </span>
          </button>

          <div className="hidden items-center space-x-6 text-white md:flex lg:space-x-8">
            <button
              type="button"
              onClick={() => handleRouteNavigation("/docs")}
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Documentation
            </button>
            <a
              href="https://github.com/the-monkeys/monkeys-identity/tree/main"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center space-x-1 text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              <Github className="h-4 w-4 transition-colors group-hover:text-primary" />
              <span>GitHub</span>
            </a>
            {!user && (
              <button
                type="button"
                onClick={() => handleRouteNavigation("/login")}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-opacity-70"
              >
                Sign In
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-opacity-70"
              >
                Sign Out
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md border border-border-color-dark p-2 text-white transition-colors hover:border-primary md:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div id="landing-mobile-menu" className="pb-3 md:hidden">
            <div className="space-y-1 rounded-xl border border-border-color-dark bg-bg-card-dark/80 p-2">
              <button
                type="button"
                onClick={() => handleRouteNavigation("/docs")}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-slate-800"
              >
                Documentation
              </button>
              <a
                href="https://github.com/the-monkeys/monkeys-identity/tree/main"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-slate-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Github className="h-4 w-4 text-primary" />
                <span>GitHub</span>
              </a>
              {!user && (
                <button
                  type="button"
                  onClick={() => handleRouteNavigation("/login")}
                  className="mt-2 w-full rounded-md bg-primary/80 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-opacity-70"
                >
                  Sign In
                </button>
              )}
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 w-full rounded-md bg-primary/80 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-opacity-70"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
