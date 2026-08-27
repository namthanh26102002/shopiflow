import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Builder from "./pages/Builder";
import QuizProjects from "./pages/QuizProjects";
import AdvertorialBuilder from "./pages/AdvertorialBuilder";
import AdvertorialProjects from "./pages/AdvertorialProjects";
import QuizPublic from "./pages/QuizPublic";
import AdvertorialPublic from "./pages/AdvertorialPublic";
import SlugResolver from "./pages/SlugResolver";
import OrderPublic from "./pages/OrderPublic";
import WinningProducts from "./pages/WinningProducts";
import WinningProductDetail from "./pages/WinningProductDetail";
import WinningProductsManage from "./pages/WinningProductsManage";
import AdminUsers from "./pages/AdminUsers";
import Info from "./pages/Info";
import InfoManage from "./pages/InfoManage";
import InfoClassroom from "./pages/InfoClassroom";
import InfoLessonEditor from "./pages/InfoLessonEditor";
import InfoLessonView from "./pages/InfoLessonView";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import OrderManage from "./pages/OrderManage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const isCustomDomain = () => {
  const host = window.location.hostname;
  return (
    host !== 'localhost' &&
    !host.endsWith('.lovable.app') &&
    !host.endsWith('.lovableproject.com') &&
    host !== 'tryshopiflow.com' &&
    host !== 'www.tryshopiflow.com'
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={isCustomDomain() ? <SlugResolver /> : <Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/quiz/:quizId" element={<QuizPublic />} />
            <Route path="/advertorial/:advertorialId" element={<AdvertorialPublic />} />
            <Route
              path="/builder"
              element={
                <ProtectedRoute>
                  <QuizProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/builder/:quizId"
              element={
                <ProtectedRoute>
                  <Builder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advertorial-builder"
              element={
                <ProtectedRoute>
                  <AdvertorialProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advertorial-builder/:advertorialId"
              element={
                <ProtectedRoute>
                  <AdvertorialBuilder />
                </ProtectedRoute>
              }
            />
            <Route path="/winning-products" element={<WinningProducts />} />
            <Route
              path="/winning-products/manage"
              element={
                <ProtectedRoute>
                  <WinningProductsManage />
                </ProtectedRoute>
              }
            />
            <Route path="/winning-products/:productId" element={<WinningProductDetail />} />
            <Route path="/info" element={<Info />} />
            <Route
              path="/info/manage"
              element={<ProtectedRoute><InfoManage /></ProtectedRoute>}
            />
            <Route path="/info/classroom/:classroomId" element={<InfoClassroom />} />
            <Route
              path="/info/lesson/:lessonId"
              element={<ProtectedRoute><InfoLessonEditor /></ProtectedRoute>}
            />
            <Route path="/info/lesson/:lessonId/view" element={<InfoLessonView />} />
            <Route path="/order/:orderNumber" element={<OrderPublic />} />
            <Route path="/orders" element={<Orders />} />
            <Route
              path="/orders/manage"
              element={<ProtectedRoute><OrderManage /></ProtectedRoute>}
            />
            <Route path="/orders/:orderId" element={<OrderDetail />} />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route path="/:slug" element={<SlugResolver />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
