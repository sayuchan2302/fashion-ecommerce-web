import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import './App.css';
import Home from './pages/Home/Home';
import TopBar from './components/TopBar/TopBar';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import ProductListing from './pages/ProductListing/ProductListing';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Cart from './pages/Cart/Cart';
import Checkout from './pages/Checkout/Checkout';
import Profile from './pages/Profile/Profile';
import NotFound from './pages/NotFound/NotFound';
import OrderSuccess from './pages/OrderSuccess/OrderSuccess';
import Search from './pages/Search/Search';
import Wishlist from './pages/Wishlist/Wishlist';
import Policy from './pages/Policy/Policy';
import About from './pages/About/About';
import Contact from './pages/Contact/Contact';
import OrderDetail from './pages/OrderDetail/OrderDetail';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import { CartAnimationProvider } from './context/CartAnimationContext';
import { WishlistProvider } from './contexts/WishlistContext';

const MainLayout = () => {
  const location = useLocation();
  const isCheckout = location.pathname === '/checkout';

  return (
    <>
      <TopBar />
      <Header />
      <Outlet />
      {!isCheckout && <Footer />}
    </>
  );
};

function App() {
  return (
    <CartAnimationProvider>
      <WishlistProvider>
        <Router>
          <ScrollToTop />
          <div className="app-container">
            <Routes>
              {/* All routes share standard layout (Header, Footer) */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/category/:id" element={<ProductListing />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/search" element={<Search />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/policy/:type" element={<Policy />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/profile/orders/:id" element={<OrderDetail />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </WishlistProvider>
    </CartAnimationProvider>
  );
}

export default App;
