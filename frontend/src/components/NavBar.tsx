import { NavLink } from "react-router";

const links = [
  { to: "/", label: "Home" },
  { to: "/create-market", label: "Create" },
  { to: "/data-details", label: "Data" },
];

export const NavBar = () => {
  return (
    <nav className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/70 p-1 shadow-sm backdrop-blur">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            [
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out",
              "focus:outline-none focus:ring-2 focus:ring-slate-300/50",
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
};