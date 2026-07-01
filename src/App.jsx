import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Decks from './pages/Decks';
import Study from './pages/Study';
import Analytics from './pages/Analytics';
import History from './pages/History';
import Settings from './pages/Settings';
import './styles/global.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout() {
  const location = useLocation();
  
  // Pages that should NOT have the sidebar (public pages)
  const publicPaths = ['/', '/login', '/signup'];
  const isPublicPage = publicPaths.includes(location.pathname);

  if (isPublicPage) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    );
  }

  // Authenticated pages with sidebar
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
          <Route path="/decks" element={<ProtectedRoute><Decks /></ProtectedRoute>} />
          <Route path="/study/:deckId" element={<ProtectedRoute><Study /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppLayout />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
