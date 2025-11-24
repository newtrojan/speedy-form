import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NewQuotePage } from './pages/NewQuote';
import { QuoteStatusPage } from './pages/QuoteStatusPage';
import { QuotePreviewPage } from './pages/QuotePreviewPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quote/new" element={<NewQuotePage />} />
        <Route path="/quote/status/:taskId" element={<QuoteStatusPage />} />
        <Route path="/quote/:quoteId" element={<QuotePreviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
