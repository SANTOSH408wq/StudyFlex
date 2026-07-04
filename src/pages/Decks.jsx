import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Sparkles, ChevronDown } from 'lucide-react';
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
  const [newDeckSubject, setNewDeckSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deckType, setDeckType] = useState('mcq');
  const [deckTypeDropdownOpen, setDeckTypeDropdownOpen] = useState(false);

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
    
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API key not found in .env");

      // 1. Generate Flashcards using AI based on Title
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: deckType === 'mcq'
                ? "You are an expert tutor. Create 10 multiple-choice flashcards for the topic provided by the user. Return ONLY a raw JSON array of objects, where each object has 'question' (string), 'options' (array of exactly 4 distinct strings), and 'correctAnswer' (string, MUST EXACTLY match one of the items in the options array). DO NOT wrap it in markdown block quotes like ```json. DO NOT include any code comments (like //) in the JSON. ONLY return the array."
                : "You are an expert tutor. Create 10 one-word answer flashcards for the topic provided by the user. The question MUST provide enough context so the answer is obvious to someone who knows the material. The 'correctAnswer' MUST be a highly specific, single word or very short phrase (1-3 words max). Return ONLY a raw JSON array of objects with 'question' and 'correctAnswer'. DO NOT wrap it in markdown block quotes like ```json. DO NOT include any code comments (like //) in the JSON. ONLY return the array."
            },
            {
              role: "user",
              content: `Topic: ${newDeckTitle}`
            }
          ]
        })
      });

      const jsonResponse = await response.json();
      if (!response.ok) throw new Error(jsonResponse.error?.message || "Failed to generate questions");

      const flashcardsJson = jsonResponse.choices[0].message.content.trim();
      let flashcards;
      try {
        const cleanJson = flashcardsJson.replace(/```json/g, '').replace(/```/g, '').trim();
        flashcards = JSON.parse(cleanJson);
      } catch (e) {
        throw new Error("Failed to parse AI response. " + flashcardsJson);
      }

      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error("No flashcards were generated.");
      }

      // 2. Insert Deck
      const { data: deckData, error: deckError } = await supabase
        .from('decks')
        .insert([
          {
            user_id: user.id,
            title: newDeckTitle,
            subject: newDeckSubject.trim() || 'AI Generated',
            color_theme: 'rgba(59,130,246,0.1)',
          }
        ])
        .select();

      if (deckError) throw deckError;
      const newDeck = deckData[0];

      // 3. Insert Flashcards
      const cardsToInsert = flashcards.map(fc => ({
        deck_id: newDeck.id,
        front_content: fc.question,
        back_content: JSON.stringify({
          options: fc.options,
          correctAnswer: fc.correctAnswer
        }),
        mastery_level: 0
      }));

      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(cardsToInsert);

      if (cardsError) throw cardsError;

      // Update local state with the new deck (mocking flashcards count)
      newDeck.flashcards = cardsToInsert;
      setDecks([newDeck, ...decks]);
      setIsModalOpen(false);
      setNewDeckTitle('');
      setNewDeckSubject('');
    } catch (err) {
      alert("Error creating deck: " + err.message);
    } finally {
      setIsSaving(false);
    }
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
              <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>Deck Subject</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Computer Science"
                value={newDeckSubject}
                onChange={(e) => setNewDeckSubject(e.target.value)}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>Deck Topic</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Intro to Python"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
              />
              <p style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>AI will automatically generate flashcards based on this topic.</p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="custom-dropdown" style={{ width: '160px', marginRight: 'auto' }}>
                <div 
                  className="form-input custom-dropdown-button" 
                  onClick={() => setDeckTypeDropdownOpen(!deckTypeDropdownOpen)}
                  style={{ padding: '12px', height: '100%', minHeight: '44px' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{deckType === 'mcq' ? 'MCQ Test' : 'One-Word Test'}</span>
                  <ChevronDown size={18} style={{ transform: deckTypeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                </div>

                {deckTypeDropdownOpen && (
                  <div className="custom-dropdown-menu">
                    <div
                      className={`custom-dropdown-item ${deckType === 'mcq' ? 'active' : ''}`}
                      onClick={() => { setDeckType('mcq'); setDeckTypeDropdownOpen(false); }}
                    >
                      MCQ Test
                    </div>
                    <div
                      className={`custom-dropdown-item ${deckType === 'one-word' ? 'active' : ''}`}
                      onClick={() => { setDeckType('one-word'); setDeckTypeDropdownOpen(false); }}
                    >
                      One-Word Test
                    </div>
                  </div>
                )}
              </div>
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn-ai" onClick={handleAddDeck} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} />
                {isSaving ? 'Generating Cards...' : 'Generate Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Decks;
