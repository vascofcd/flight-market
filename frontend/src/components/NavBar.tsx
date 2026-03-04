import { NavLink } from "react-router";

export const NavBar = () => {
  const base =
    "inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition " +
    "focus:outline-none focus:ring-2 focus:ring-slate-400/40";

  return (
    <nav className="flex items-center gap-2">
      <NavLink
        to="/"
        className={({ isActive }) =>
          [
            base,
            isActive
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")
        }
      >
        Home
      </NavLink>

      <NavLink
        to="/create-market"
        className={({ isActive }) =>
          [
            base,
            isActive
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")
        }
      >
        Create
      </NavLink>
    </nav>
  );
};