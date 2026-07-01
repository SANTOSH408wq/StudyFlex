import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2 } from 'lucide-react';
import '../styles/Decks.css';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

function Decks() {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckEmoji, setNewDeckEmoji] = useState('📚');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDecks();
    }
  }, [user]);

  async function fetchDecks() {
    setLoading(true);
    // Fetch decks
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        flashcards(id),
        study_sessions(correct_count, cards_reviewed, started_at)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching decks:', error.message);
    } else {
      setDecks(data || []);
    }
    setLoading(false);
  }

  async function handleAddDeck() {
    if (!newDeckTitle.trim()) return;
    setIsSaving(true);
    
    const { data, error } = await supabase
      .from('decks')
      .insert([
        {
          user_id: user.id,
          title: newDeckTitle,
          subject: newDeckEmoji, // Storing emoji in the subject column
          color_theme: 'rgba(59,130,246,0.1)',
        }
      ])
      .select();

    if (error) {
      alert(error.message);
    } else if (data) {
      setDecks([data[0], ...decks]);
      setIsModalOpen(false);
      setNewDeckTitle('');
      setNewDeckEmoji('📚');
    }
    setIsSaving(false);
  }

  async function handleDeleteDeck(id) {
    if (!confirm('Are you sure you want to delete this deck and all its flashcards?')) return;

    const { error } = await supabase
      .from('decks')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
    } else {
      setDecks(decks.filter((d) => d.id !== id));
    }
  }

  const filteredDecks = decks.filter(deck => 
    deck.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1>Flashcard Decks</h1>
        <p>Review and study your generated flashcard decks</p>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search decks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            New Deck
          </button>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="decks-grid">
        {loading ? (
          <p className="empty-state">Loading decks...</p>
        ) : filteredDecks.length === 0 ? (
          <p className="empty-state">No decks found. Create your first flashcard deck!</p>
        ) : (
          filteredDecks.map((deck) => {
            const cardCount = deck.flashcards?.length || 0;
            const sessions = deck.study_sessions || [];
            // Sort to get latest session
            const latestSession = sessions.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
            const accuracy = latestSession && latestSession.cards_reviewed > 0
              ? Math.round((latestSession.correct_count / latestSession.cards_reviewed) * 100)
              : 0;
            const correctCount = latestSession ? latestSession.correct_count : 0;
            const reviewedCount = latestSession ? latestSession.cards_reviewed : 0;

            return (
              <div 
                key={deck.id}
                className="deck-card glass-card fade-in-up"
                onClick={() => navigate(`/study/${deck.id}`)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <button 
                  className="btn-icon" 
                  style={{ position: 'absolute', top: '16px', right: '16px', opacity: 0.6, zIndex: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDeck(deck.id);
                  }}
                  title="Delete Deck"
                >
                  <Trash2 size={16} />
                </button>
                <span className="note-tag" style={{ background: deck.color_theme || 'rgba(59,130,246,0.1)', color: '#60a5fa', marginBottom: '12px', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500' }}>
                  {deck.subject || 'General'}
                </span>
                <h3 className="deck-title">{deck.title}</h3>
                <p className="deck-count">{cardCount} cards</p>

                <div className="deck-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ 
                        width: `${accuracy}%`,
                        background: accuracy >= 80 ? '#4ade80' : accuracy >= 50 ? '#fb923c' : '#f87171' 
                      }}
                    ></div>
                  </div>
                  <div className="progress-label">
                    <span>{correctCount} / {reviewedCount > 0 ? reviewedCount : cardCount} correct latest run</span>
                    <span>{accuracy}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Deck Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Deck</h2>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>Deck Emoji</label>
              <input
                className="form-input"
                type="text"
                placeholder="📚"
                maxLength={2}
                value={newDeckEmoji}
                onChange={(e) => setNewDeckEmoji(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>Deck Title</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Intro to Python"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddDeck} disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Decks;
