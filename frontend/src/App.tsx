import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { QuoteWizard } from './features/quote-wizard';
import { QuoteStatusPage } from './pages/QuoteStatusPage';
import { QuotePreviewPage } from './pages/QuotePreviewPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import LoginPage from './features/auth/pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/quote/new" element={<QuoteWizard />} />
        <Route path="/quote/status/:taskId" element={<QuoteStatusPage />} />
        <Route path="/quote/:quoteId" element={<QuotePreviewPage />} />

        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/quotes/:quoteId"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
