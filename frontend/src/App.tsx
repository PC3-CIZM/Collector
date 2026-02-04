import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import Service1Page from "./pages/Service1Page";
import Service2Page from "./pages/Service2Page";
import AdminPage from "./pages/admin/AdminPage";
import SellerPage from "./pages/seller/SellerPage";
import { AdminRoute } from "./routes/AdminRoute";
import { SellerRoute } from "./routes/SellerRoute";

import HomePage from "./pages/HomePage";
import BoutiquePage from "./pages/BoutiquePage";
import VendeurPage from "./pages/VendeurPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>

          {/* public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/accueil" element={<HomePage />} />
          <Route path="/boutique/:id" element={<BoutiquePage />} />
          <Route path="/vendeur/:id" element={<VendeurPage />} />

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
