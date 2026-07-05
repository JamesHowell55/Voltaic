import { NavLink } from 'react-router-dom';
import voltaicLogo from '../assets/brand/voltaic-labs-logo-dark-transparent.svg';
import ThemeControls from './ThemeControls';

export default function NavBar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-brand">
        <img src={voltaicLogo} alt="Voltaic Labs" className="navbar-logo" />
        <span className="brand-sub">Engineering Calculators</span>
      </NavLink>
      <nav className="navbar-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Home
        </NavLink>
        <NavLink to="/busbar" className={({ isActive }) => (isActive ? 'active' : '')}>
          Busbar Calculator
        </NavLink>
        <NavLink to="/creepage-clearance" className={({ isActive }) => (isActive ? 'active' : '')}>
          Creepage &amp; Clearance
        </NavLink>
        <NavLink to="/bolted-joint" className={({ isActive }) => (isActive ? 'active' : '')}>
          Bolted Joint
        </NavLink>
        <ThemeControls />
      </nav>
    </header>
  );
}
