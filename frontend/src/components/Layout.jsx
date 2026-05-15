import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const dash =
    user?.role === "admin" ? "/admin" : user?.role === "ngo" ? "/ngo" : user?.role === "donor" ? "/donor" : null;

  return (
    <div className="min-h-screen flex flex-col text-slate-800">
      <header className="sticky top-0 z-50 border-b border-emerald-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="font-display font-bold text-xl text-brand-green flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-orange-500 text-white shadow-md">
              FB
            </span>
            FoodBridge . 
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <NavLink to="/" className={({ isActive }) => (isActive ? "text-brand-orange" : "hover:text-brand-green")}>
              Home
            </NavLink>
            {dash && (
              <NavLink
                to={dash}
                className={({ isActive }) => (isActive ? "text-brand-orange" : "hover:text-brand-green")}
              >
                Dashboard
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) => (isActive ? "text-brand-orange" : "hover:text-brand-green")}
              >
                Admin
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-600 hover:text-brand-green px-2 py-1.5 rounded-lg"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-orange-500 px-4 py-2 rounded-full shadow hover:opacity-95"
                >
                  Join
                </Link>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-500 hidden sm:inline">{user.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="text-sm font-semibold text-slate-600 border border-slate-200 rounded-full px-3 py-1.5 hover:border-brand-green hover:text-brand-green"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <motion.main initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
        {children}
      </motion.main>
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-3 gap-8 text-sm text-slate-600">
          <div>
            <p className="font-display font-semibold text-brand-green text-base mb-2">FoodBridge</p>
            <p>Connecting surplus food with NGOs and volunteers before it is wasted.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-2">Explore</p>
            <ul className="space-y-1">
              <li>
                <a className="hover:text-brand-orange" href="https://github.com/" rel="noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a className="hover:text-brand-orange" href="#" onClick={(e) => e.preventDefault()}>
                  API Docs
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-2">Social</p>
            <div className="flex gap-3">
              {["Twitter", "LinkedIn", "Instagram"].map((s) => (
                <span key={s} className="px-3 py-1 rounded-full bg-slate-100 text-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 pb-6">© {new Date().getFullYear()} FoodBridge</div>
      </footer>
    </div>
  );
}
