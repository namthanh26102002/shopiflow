import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Every route is its own chunk, so a visitor landing on a public quiz page
// does not download the builder, the charts or the drag-and-drop libraries.
const Auth = lazy(() => import("./pages/Auth"));
const Builder = lazy(() => import("./pages/Builder"));
const BuilderEntry = lazy(() => import("./pages/BuilderEntry"));
const AdvertorialBuilder = lazy(() => import("./pages/AdvertorialBuilder"));
const AdvertorialBuilderEntry = lazy(() => import("./pages/AdvertorialBuilderEntry"));
const QuizPublic = lazy(() => import("./pages/QuizPublic"));
const AdvertorialPublic = lazy(() => import("./pages/AdvertorialPublic"));
const SlugResolver = lazy(() => import("./pages/SlugResolver"));
const OrderPublic = lazy(() => import("./pages/OrderPublic"));
const WinningProducts = lazy(() => import("./pages/WinningProducts"));
const WinningProductDetail = lazy(() => import("./pages/WinningProductDetail"));
const WinningProductsManage = lazy(() => import("./pages/WinningProductsManage"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const Info = lazy(() => import("./pages/Info"));
const InfoManage = lazy(() => import("./pages/InfoManage"));
const InfoClassroom = lazy(() => import("./pages/InfoClassroom"));
const InfoLessonEditor = lazy(() => import("./pages/InfoLessonEditor"));
const InfoLessonView = lazy(() => import("./pages/InfoLessonView"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const OrderManage = lazy(() => import("./pages/OrderManage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Hosts that serve the app itself. Anything else is treated as a customer's
// custom domain and routed through SlugResolver, so every host we deploy to
// must be listed here — including preview URLs and LAN addresses used for
// local testing, which would otherwise resolve as customer domains.
const APP_HOSTS = ['localhost', '127.0.0.1', 'tryshopiflow.com', 'www.tryshopiflow.com'];
const APP_HOST_SUFFIXES = ['.lovable.app', '.lovableproject.com', '.vercel.app'];

const isCustomDomain = () => {
  const host = window.location.hostname;

  if (APP_HOSTS.includes(host)) return false;
  if (APP_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;

  // Private ranges: the Vite dev server's Network URL, used to test on phones.
  if (/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;

  return true;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={isCustomDomain() ? <SlugResolver /> : <Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/quiz/:quizId" element={<QuizPublic />} />
            <Route path="/advertorial/:advertorialId" element={<AdvertorialPublic />} />
            <Route
              path="/builder"
              element={
                <ProtectedRoute>
                  <BuilderEntry />
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
                  <AdvertorialBuilderEntry />
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
