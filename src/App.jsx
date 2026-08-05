import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import "./styles/globals.css";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <div className="phone-frame">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
