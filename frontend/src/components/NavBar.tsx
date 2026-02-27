import { NavLink } from "react-router";

export const NavBar = () => {
  return (
    <nav>
      <NavLink to="/">Home</NavLink>
      <NavLink to="/create-market">Create Market</NavLink>
    </nav>
  );
};
