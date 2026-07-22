import "./Logo.css";

export default function Logo() {
  function handleClick() {
    window.location.href = "/";
  }

  return (
    <span className="logo-text" onClick={handleClick}>
      TraffWise
    </span>
  );
}
