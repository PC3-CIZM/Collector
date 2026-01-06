import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import HomePage from "./pages/HomePage";
import Service1Page from "./pages/Service1Page";
import Service2Page from "./pages/Service2Page";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/service1" element={<Service1Page />} />
          <Route path="/service2" element={<Service2Page />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
