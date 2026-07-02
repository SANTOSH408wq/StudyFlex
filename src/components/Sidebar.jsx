import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Sidebar.css';
import { 
  LayoutDashboard, 
  FileText, 
  Layers, 
  BarChart3, 
  Settings, 
  LogOut,
  GraduationCap,
  History as HistoryIcon,
  X
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/notes', label: 'My Notes', icon: FileText },
  { path: '/decks', label: 'Flashcard Decks', icon: Layers },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/history', label: 'Test History', icon: HistoryIcon },
];

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-content">
          <div className="logo-icon">
            <GraduationCap size={20} />
          </div>
          <h2>StudyFlex</h2>
        </div>
        <button className="mobile-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path === '/decks' && location.pathname.startsWith('/study'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon className="nav-icon" size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Link 
          to="/settings" 
          className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} 
          style={{ textDecoration: 'none' }}
          onClick={onClose}
        >
          <Settings className="nav-icon" size={20} />
          <span>Settings</span>
        </Link>
        <button className="nav-item" onClick={() => { handleLogout(); onClose(); }}>
          <LogOut className="nav-icon" size={20} />
          <span>Log Out</span>
        </button>
        <Link to="/settings" className="user-profile" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }} onClick={onClose}>
          <div className="user-avatar" style={{ overflow: 'hidden' }}>
            {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
              <img src={profile?.avatar_url || user.user_metadata?.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              profile?.full_name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'
            )}
          </div>
          <div className="user-info">
            <div className="user-name">{profile?.full_name || user?.user_metadata?.full_name || 'User'}</div>
            <div className="user-email">{user?.email}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
