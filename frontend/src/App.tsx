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
import { ToastProvider } from './contexts/ToastContext';
import { CartAnimationProvider } from './context/CartAnimationContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CartProvider } from './contexts/CartContext';
import { FilterProvider } from './contexts/FilterContext';
import { AuthProvider } from './contexts/AuthContext';
import OrdersPage from './pages/Account/OrdersPage';
import AddressesPage from './pages/Account/AddressesPage';
import SecurityPage from './pages/Account/SecurityPage';
import OrderDetailPage from './pages/Account/OrderDetailPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import OrderTracking from './pages/OrderTracking/OrderTracking';
import Returns from './pages/Returns/Returns';
import FAQ from './pages/FAQ/FAQ';
import PaymentResult from './pages/PaymentResult/PaymentResult';
import SizeGuide from './pages/SizeGuide/SizeGuide';
import Stores from './pages/Stores/Stores';
import Admin from './pages/Admin/Admin';
import AdminOrders from './pages/Admin/AdminOrders';
import AdminProducts from './pages/Admin/AdminProducts';
import AdminOrderDetail from './pages/Admin/AdminOrderDetail';
import AdminCategories from './pages/Admin/AdminCategories';
import AdminCustomers from './pages/Admin/AdminCustomers';
import AdminPromotions from './pages/Admin/AdminPromotions';

const MainLayout = () => {
  const location = useLocation();
  const isCheckout = location.pathname === '/checkout';
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <TopBar />}
      {!isAdmin && <Header />}
      <Outlet />
      {!isCheckout && !isAdmin && <Footer />}
    </>
  );
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <CartAnimationProvider>
            <WishlistProvider>
              <FilterProvider>
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
                        <Route path="/order-tracking" element={<OrderTracking />} />
                        <Route path="/returns" element={<Returns />} />
                        <Route path="/payment-result" element={<PaymentResult />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/size-guide" element={<SizeGuide />} />
                        <Route path="/stores" element={<Stores />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/admin/orders" element={<AdminOrders />} />
                        <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
                        <Route path="/admin/products" element={<AdminProducts />} />
                        <Route path="/admin/categories" element={<AdminCategories />} />
                        <Route path="/admin/customers" element={<AdminCustomers />} />
                        <Route path="/admin/customer" element={<AdminCustomers />} />
                        <Route path="/admin/promotions" element={<AdminPromotions />} />
                        <Route path="/policy/:type" element={<Policy />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/profile/orders/:id" element={<OrderDetail />} />
                        <Route path="/account/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                        <Route path="/account/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
                        <Route path="/account/addresses" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
                        <Route path="/account/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </div>
                </Router>
              </FilterProvider>
            </WishlistProvider>
          </CartAnimationProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
