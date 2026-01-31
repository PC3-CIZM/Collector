import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import HomePage from "./pages/HomePage";
import Service1Page from "./pages/Service1Page";
import Service2Page from "./pages/Service2Page";
import AdminPage from "./pages/admin/AdminPage";
import SellerPage from "./pages/seller/SellerPage";
import { AdminRoute } from "./routes/AdminRoute";
import { SellerRoute } from "./routes/SellerRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/service1" element={<Service1Page />} />
          <Route path="/service2" element={<Service2Page />} />

          {/* Admin (ADMIN only) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />

          {/* Seller area (SELLER only) */}
          <Route
            path="/seller/*"
            element={
              <SellerRoute>
                <SellerPage />
              </SellerRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
