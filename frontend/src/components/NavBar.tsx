import { NavLink } from "react-router";

export const NavBar = () => {
  return (
    <>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/create-market">Create</NavLink>
      </div>
    </>
  );
};
