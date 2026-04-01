import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import HomePage from './pages/HomePage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import ComparePage from './pages/ComparePage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import SharedResultPage from './pages/SharedResultPage.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/result/:id" element={<SharedResultPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}
