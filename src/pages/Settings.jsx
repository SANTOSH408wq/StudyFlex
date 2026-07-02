import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Camera, Save, Moon, Sun, Lock, ChevronDown } from 'lucide-react';
import '../styles/Settings.css';

function Settings() {
  const { user, profile } = useAuth();
  const { themePreference, setThemePreference, actualTheme } = useTheme();

  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (profile) {
      if (!fullName) setFullName(profile.full_name || user?.user_metadata?.full_name || '');
      if (!phone) setPhone(profile.phone || '');
      if (!avatarUrl) setAvatarUrl(profile.avatar_url || user?.user_metadata?.avatar_url || '');
    } else if (user) {
      if (!avatarUrl) setAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  }, [profile, user]);

  const themeOptions = [
    { value: 'light', label: 'Light Mode' },
    { value: 'dark', label: 'Dark Mode' },
    { value: 'system', label: 'System Default' }
  ];

  const currentThemeLabel = themeOptions.find(opt => opt.value === themePreference)?.label;

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone })
      .eq('id', user.id);
      
    // Update Auth user metadata (so sidebar updates)
    const { error: authError } = await supabase.auth.updateUser({
      email: email !== user.email ? email : undefined,
      data: { full_name: fullName }
    });

    if (profileError || authError) {
      alert(profileError?.message || authError?.message);
    } else {
      alert('Profile updated successfully!');
    }
    setIsSaving(false);
  };

  const handleSecuritySave = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    setIsSavingSecurity(true);
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      alert(error.message);
    } else {
      alert('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
    }
    setIsSavingSecurity(false);
  };

  const handleAvatarChange = async (event) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      setIsUploading(true);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update the persistent database profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      alert('Avatar updated successfully!');

    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="settings-container">
        {/* Profile Section */}
        <section className="settings-section glass-card fade-in-up">
          <div className="section-header">
            <h2>Profile</h2>
            <p>Update your personal information</p>
          </div>
          
          <form onSubmit={handleProfileSave} className="settings-form">
            <div className="avatar-picker">
              <div className="avatar-preview">
                {isUploading ? (
                  <div style={{ fontSize: '14px', color: '#fff' }}>...</div>
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  fullName?.charAt(0) || user?.email?.charAt(0) || 'U'
                )}
                <div className="avatar-overlay">
                  <Camera size={20} />
                </div>
              </div>
              <div className="avatar-instructions">
                <label className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer', display: 'inline-block' }}>
                  {isUploading ? 'Uploading...' : 'Change Avatar'}
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/gif" 
                    style={{ display: 'none' }} 
                    onChange={handleAvatarChange}
                    onClick={(e) => (e.target.value = null)}
                    disabled={isUploading}
                  />
                </label>
                <p>JPG, GIF or PNG. Max size of 2MB.</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  className="form-input"
                  type="number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                />
              </div>
              <div className="form-group"></div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={isSaving || loading}>
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </section>

        {/* Appearance Section */}
        <section className="settings-section glass-card fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="section-header">
            <h2>Appearance</h2>
            <p>Customize how StudyFlex looks on your device</p>
          </div>
          
          <div className="theme-toggle-container">
            <div className="theme-info">
              <div className="theme-icon-wrapper">
                {actualTheme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
              </div>
              <div>
                <h3>Theme Preference</h3>
                <p>Currently using {actualTheme === 'dark' ? 'Dark' : 'Light'} Mode</p>
              </div>
            </div>
            
            <div className="custom-dropdown">
              <div 
                className="form-input custom-dropdown-button" 
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              >
                <span>{currentThemeLabel}</span>
                <ChevronDown size={18} style={{ transform: themeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
              </div>

              {themeDropdownOpen && (
                <div className="custom-dropdown-menu">
                  {themeOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`custom-dropdown-item ${themePreference === opt.value ? 'active' : ''}`}
                      onClick={() => {
                        setThemePreference(opt.value);
                        setThemeDropdownOpen(false);
                      }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="settings-section glass-card fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="section-header">
            <h2>Security</h2>
            <p>Manage your password and security settings</p>
          </div>
          
          <form onSubmit={handleSecuritySave} className="settings-form">
            <div className="form-row">
              <div className="form-group">
                <label>New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a new password"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={isSavingSecurity}>
                <Lock size={18} />
                {isSavingSecurity ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Settings;
