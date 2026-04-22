import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import Legal from "./pages/Legal";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewScan from "./pages/NewScan";
import ScanResult from "./pages/ScanResult";
import FieldDetail from "./pages/FieldDetail";
import Admin from "./pages/Admin";
import Tickets from "./pages/Tickets";
import NewTicket from "./pages/NewTicket";
import TicketDetail from "./pages/TicketDetail";
import CropPlan from "./pages/CropPlan";
import SprayCalc from "./pages/SprayCalc";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <OfflineBanner />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/scan/new" element={<RequireAuth><NewScan /></RequireAuth>} />
              <Route path="/scan/:id" element={<RequireAuth><ScanResult /></RequireAuth>} />
              <Route path="/field/:id" element={<RequireAuth><FieldDetail /></RequireAuth>} />
              <Route path="/tickets" element={<RequireAuth><Tickets /></RequireAuth>} />
              <Route path="/tickets/new" element={<RequireAuth><NewTicket /></RequireAuth>} />
              <Route path="/tickets/:id" element={<RequireAuth><TicketDetail /></RequireAuth>} />
              <Route path="/plan" element={<RequireAuth><CropPlan /></RequireAuth>} />
              <Route path="/spray" element={<RequireAuth><SprayCalc /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
              <Route path="/about" element={<Legal variant="about" />} />
              <Route path="/privacy" element={<Legal variant="privacy" />} />
              <Route path="/terms" element={<Legal variant="terms" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AnnouncementPopup />
            <InstallPrompt />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
