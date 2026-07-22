import "./Header.css";
import Logo from "./Logo";
import Navbar from "./Navbar";

export default function Header() {
  return (
    <header className="header">
      <div className="header-wrapper">
        <div className="logo-container">
          <Logo />
        </div>
        <Navbar />
      </div>
    </header>
  );
}
