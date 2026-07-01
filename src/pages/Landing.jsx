import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Landing.css';
import { Sparkles, Brain, BarChart3, BookOpen, GraduationCap, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { sendEmail } from '../utils/resend';

function Landing() {
  const { themePreference, setThemePreference, actualTheme } = useTheme();
  const [isSending, setIsSending] = useState(false);

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <GraduationCap size={24} />
          <span>StudyFlex</span>
        </div>

        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#ai">AI</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="nav-buttons" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn-icon" 
            onClick={() => setThemePreference(themePreference === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            style={{ borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {actualTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/login" className="btn-ghost">Sign In</Link>
          <Link to="/signup" className="btn-primary" style={{ borderRadius: '100px', padding: '10px 20px' }}>Get started free</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={16} />
          <span>Powered by AI</span>
        </div>

        <h1>
          Study Smarter, Not Harder with <span>StudyFlex</span>
        </h1>

        <p>
          Transform your notes into intelligent flashcards, track your learning
          progress, and ace your exams with the power of AI.
        </p>

        <div className="hero-buttons">
          <Link to="/signup" className="btn-primary btn-large">Start Learning Free</Link>
          <Link to="/login" className="btn-secondary">Sign In</Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <h2>Everything you need to learn effectively</h2>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
              <Brain size={24} style={{ color: '#3b82f6' }} />
            </div>
            <h3>AI Flashcard Generation</h3>
            <p>
              Paste your notes and let our AI instantly create comprehensive
              flashcards for any subject.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
              <BarChart3 size={24} style={{ color: '#22c55e' }} />
            </div>
            <h3>Study Analytics</h3>
            <p>
              Track your progress with beautiful charts. See your retention
              rates, study streaks, and weak areas.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
              <BookOpen size={24} style={{ color: '#a855f7' }} />
            </div>
            <h3>Smart Notebooks</h3>
            <p>
              Organize your study materials into notebooks. Write, edit, and
              manage notes with ease.
            </p>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="features-section" id="ai" style={{ paddingTop: '100px' }}>
        <div style={{ marginBottom: '60px', textAlign: 'center' }}>
          <h2>Powered by Advanced AI</h2>
          <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto', fontSize: '18px', lineHeight: '1.6' }}>
            Our proprietary AI engine doesn't just copy your notes. It understands context, extracts key concepts, and crafts perfect flashcards designed for maximum retention.
          </p>
        </div>
        
        <div className="features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
          <div className="feature-card glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="feature-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
              <Brain size={24} style={{ color: '#3b82f6' }} />
            </div>
            <h3>Smart Extraction</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>Automatically identifies definitions, formulas, and critical concepts from raw text to build your study decks instantly.</p>
          </div>
          <div className="feature-card glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="feature-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
              <Sparkles size={24} style={{ color: '#a855f7' }} />
            </div>
            <h3>Contextual Learning</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>Generates detailed explanations for every answer so you truly understand the material rather than just memorizing it.</p>
          </div>
        </div>
      </section>


      {/* Contact Section */}
      <section className="features-section" id="contact" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <div style={{ marginBottom: '60px', textAlign: 'center' }}>
          <h2>Get in Touch</h2>
          <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto', fontSize: '18px', lineHeight: '1.6' }}>Have questions? Send us a message and we'll get back to you shortly.</p>
        </div>
        
        <form 
          className="glass-card" 
          style={{ padding: '40px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}
          onSubmit={async (e) => {
            e.preventDefault();
            setIsSending(true);
            const formData = new FormData(e.target);
            const data = {
              name: formData.get('name'),
              email: formData.get('email'),
              subject: formData.get('subject'),
              message: formData.get('message'),
            };
            const result = await sendEmail(data);
            setIsSending(false);
            if (result.success) {
              alert('Message sent successfully!');
              e.target.reset();
            } else {
              alert('Failed to send message. ' + (result.error || 'Please try again later.'));
            }
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Name</label>
              <input name="name" required className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} type="text" placeholder="John Doe" />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Email</label>
              <input name="email" required className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} type="email" placeholder="john@example.com" />
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Subject</label>
            <input name="subject" required className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} type="text" placeholder="How can we help?" />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Message</label>
            <textarea name="message" required className="form-textarea" style={{ width: '100%', boxSizing: 'border-box', minHeight: '150px' }} placeholder="Your message here..."></textarea>
          </div>
          <button type="submit" disabled={isSending} className="btn-primary" style={{ padding: '16px', fontSize: '16px', marginTop: '8px', display: 'flex', justifyContent: 'center', borderRadius: '14px', opacity: isSending ? 0.7 : 1, cursor: isSending ? 'not-allowed' : 'pointer' }}>
            {isSending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '14px',
        borderTop: '1px solid rgba(180, 210, 240, 0.2)'
      }}>
        <p>© 2026 StudyFlex. Built with ❤️ for students everywhere.</p>
      </footer>
    </div>
  );
}

export default Landing;
