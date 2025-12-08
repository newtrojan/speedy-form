import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { QuoteWizard } from './features/quote-wizard';
import { QuoteStatusPage } from './pages/QuoteStatusPage';
import { QuotePreviewPage } from './pages/QuotePreviewPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quote/new" element={<QuoteWizard />} />
        <Route path="/quote/status/:taskId" element={<QuoteStatusPage />} />
        <Route path="/quote/:quoteId" element={<QuotePreviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
