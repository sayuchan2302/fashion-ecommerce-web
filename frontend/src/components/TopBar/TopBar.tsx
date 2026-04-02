import './TopBar.css';
import { Link } from 'react-router-dom';

const TopBar = () => {
  return (
    <div className="topbar">
      <div className="topbar-content container">
        <Link to="/vendor/register" className="topbar-item topbar-item-primary">
          {'B\u00e1n h\u00e0ng c\u00f9ng COOLMATE Marketplace'}
        </Link>

        <nav className="topbar-right">
          <Link to="/about" className="topbar-item">{'V\u1ec1 ch\u00fang t\u00f4i'}</Link>
          <Link to="/contact" className="topbar-item">{'Li\u00ean h\u1ec7'}</Link>
          <Link to="/faq" className="topbar-item">FAQ</Link>
        </nav>
      </div>
    </div>
  );
};

export default TopBar;
