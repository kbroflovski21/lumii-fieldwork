import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { SiteProvider } from "./auth/SiteContext";
import { router } from "./router";

export function App() {
  return (
    <AuthProvider>
      <SiteProvider>
        <RouterProvider router={router} />
      </SiteProvider>
    </AuthProvider>
  );
}

export default App;
