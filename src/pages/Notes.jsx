import { useState, useEffect } from 'react';
import '../styles/Notes.css';
import { Search, Plus, Calendar, X, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Note View State
  const [selectedNote, setSelectedNote] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testType, setTestType] = useState('mcq');

  // New Note State
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  async function fetchNotes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error.message);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    if (!newTitle || !newSubject) {
      alert('Please fill out the title and subject!');
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          user_id: user.id,
          title: newTitle,
          subject: newSubject,
          content: newContent,
          tags: [newSubject], // store subject as a tag for filtering
        }
      ])
      .select();

    if (error) {
      alert(error.message);
    } else if (data) {
      setNotes([data[0], ...notes]); // prepend the new note
      setShowModal(false);
      setNewTitle('');
      setNewSubject('');
      setNewContent('');
    }
    setIsSaving(false);
  }

  async function handleDeleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
    } else {
      setNotes(notes.filter((n) => n.id !== id));
    }
  }

  // Derive dynamic filters from the subjects of the notes
  const uniqueSubjects = Array.from(new Set(notes.map(n => n.subject).filter(Boolean)));
  const filters = ['All', ...uniqueSubjects];

  async function handleGenerateFlashcards(note) {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API key not found in .env");

      // 1. Call Groq
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: testType === 'mcq' 
                ? "You are an expert tutor. Create multiple-choice flashcards from the provided text. Return ONLY a raw JSON array of objects, where each object has 'question' (string), 'options' (array of exactly 4 strings), and 'correctAnswer' (string, matching one of the options). DO NOT wrap it in markdown block quotes like ```json. DO NOT include any code comments (like //) in the JSON. ONLY return the array."
                : "You are an expert tutor. Extract key concepts from the text into clear, logical, and unambiguous questions. The question MUST provide enough context so the answer is obvious to someone who knows the material (e.g., 'What JavaScript keyword is used to declare block-scoped variables?'). The 'correctAnswer' MUST be a highly specific, single word or very short phrase (1-3 words max). Return ONLY a raw JSON array of objects with 'question' and 'correctAnswer'. DO NOT wrap it in markdown block quotes like ```json. DO NOT include any code comments (like //) in the JSON. ONLY return the array."
            },
            {
              role: "user",
              content: note.content
            }
          ]
        })
      });

      const jsonResponse = await response.json();
      if (!response.ok) throw new Error(jsonResponse.error?.message || "Failed to generate");

      const flashcardsJson = jsonResponse.choices[0].message.content.trim();
      let flashcards;
      try {
        // Strip out any markdown formatting just in case
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
            title: `${note.title} Flashcards`,
            subject: note.subject || '📚',
            color_theme: 'rgba(59,130,246,0.1)'
          }
        ])
        .select();

      if (deckError) throw deckError;
      const newDeckId = deckData[0].id;

      // 3. Insert Flashcards
      const cardsToInsert = flashcards.map(fc => ({
        deck_id: newDeckId,
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

      alert(`Successfully generated ${flashcards.length} flashcards! Go to Flashcard Decks to view them.`);
      setSelectedNote(null);
    } catch (err) {
      alert("Error generating flashcards: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  const filteredNotes = notes.filter(note => {
    const matchesFilter = activeFilter === 'All' || note.subject === activeFilter || (note.tags && note.tags.includes(activeFilter));
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="notes-page">
      <div className="page-header">
        <h1>My Notes</h1>
        <p>All your study notes in one place</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-chips">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`filter-chip${activeFilter === filter ? ' active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            New Note
          </button>
        </div>
      </div>

      <div className="notes-grid">
        {loading ? (
          <p className="empty-state">Loading notes...</p>
        ) : filteredNotes.length === 0 ? (
          <p className="empty-state">No notes found. Create your first note!</p>
        ) : (
          filteredNotes.map((note) => (
            <div 
              className="note-card glass-card" 
              key={note.id} 
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => setSelectedNote(note)}
            >
              <button 
                className="btn-icon" 
                style={{ position: 'absolute', top: '16px', right: '16px', opacity: 0.6, zIndex: 10 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNote(note.id);
                }}
                title="Delete Note"
              >
                <Trash2 size={16} />
              </button>
              
              <span className={`note-tag`} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                {note.subject || 'General'}
              </span>
              <div className="note-title">{note.title}</div>
              <div className="note-preview">
                {note.content ? (note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '')) : 'No content'}
              </div>
              <div className="note-footer">
                <div className="note-date">
                  <Calendar size={14} />
                  {new Date(note.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Note Modal */}
      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div>
                <span className="note-tag" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', marginBottom: '8px', display: 'inline-block' }}>
                  {selectedNote.subject || 'General'}
                </span>
                <h2 style={{ fontSize: '24px' }}>{selectedNote.title}</h2>
                <div className="note-date" style={{ marginTop: '4px', border: 'none', background: 'transparent', padding: 0 }}>
                  {new Date(selectedNote.created_at).toLocaleDateString()}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedNote(null)} style={{ alignSelf: 'flex-start' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="note-content" style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {selectedNote.content || 'No content provided.'}
            </div>

            <div className="modal-actions" style={{ marginTop: '24px', justifyContent: 'flex-start', display: 'flex', gap: '12px' }}>
              <select 
                className="form-input" 
                style={{ width: '160px', padding: '12px' }} 
                value={testType} 
                onChange={(e) => setTestType(e.target.value)}
              >
                <option value="mcq">MCQ Test</option>
                <option value="one-word">One-Word Test</option>
              </select>
              <button 
                className="btn-ai" 
                onClick={() => handleGenerateFlashcards(selectedNote)}
                disabled={isGenerating}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Sparkles size={18} />
                {isGenerating ? 'Analyzing Note and Generating Cards...' : 'Generate Flashcards with AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Note</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form className="auth-form" onSubmit={handleSaveNote}>
              <div className="form-group">
                <label>Title</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Note title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. JavaScript, Biology, etc."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  className="form-textarea"
                  placeholder="Start writing your notes here..."
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>
              
              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: '100%', justifyContent: 'center' }}>
                  {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notes;
