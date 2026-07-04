import { useState, useEffect } from 'react';
import '../styles/Notes.css';
import { Search, Plus, Calendar, X, Sparkles, Trash2, Image as ImageIcon, FileText, ChevronDown } from 'lucide-react';
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
  const [testTypeDropdownOpen, setTestTypeDropdownOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [noteSummary, setNoteSummary] = useState(null);

  // New Note State
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

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
      setPreviewImage(null);
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

  async function handleTranscribeImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    setIsTranscribing(true);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API key not found in .env");

      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
      setPreviewImage(base64Image);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Transcribe the handwritten or printed notes in this image with high precision. Format the transcription neatly with markdown headers and bullet points where appropriate. Do not include any extra conversational text."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ]
        })
      });

      const jsonResponse = await response.json();
      if (!response.ok) throw new Error(jsonResponse.error?.message || "Failed to transcribe");

      const transcription = jsonResponse.choices[0].message.content.trim();
      setNewContent(prev => prev ? prev + '\n\n' + transcription : transcription);
    } catch (err) {
      alert("Error transcribing image: " + err.message);
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleSummarizeNote(note) {
    if (isSummarizing) return;
    setIsSummarizing(true);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API key not found in .env");

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
              content: "You are an expert at summarizing notes. Create a concise, well-formatted summary of the provided text. Use bullet points and bold text for key concepts."
            },
            {
              role: "user",
              content: note.content
            }
          ]
        })
      });

      const jsonResponse = await response.json();
      if (!response.ok) throw new Error(jsonResponse.error?.message || "Failed to generate summary");

      setNoteSummary(jsonResponse.choices[0].message.content.trim());
    } catch (err) {
      alert("Error summarizing notes: " + err.message);
    } finally {
      setIsSummarizing(false);
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
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: testType === 'mcq' 
                ? "You are an expert tutor. Create multiple-choice flashcards from the provided text. Return ONLY a raw JSON array of objects, where each object has 'question' (string), 'options' (array of exactly 4 distinct strings), and 'correctAnswer' (string, MUST EXACTLY match one of the items in the options array). DO NOT wrap it in markdown block quotes like ```json. DO NOT include any code comments (like //) in the JSON. ONLY return the array."
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
              onClick={() => {
                setSelectedNote(note);
                setNoteSummary(null);
              }}
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
      {selectedNote && !noteSummary && (
        <div className="modal-overlay" onClick={() => { setSelectedNote(null); setNoteSummary(null); }}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div>
                <span className="note-tag" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', marginBottom: '8px', display: 'inline-block', borderRadius: '9999px', padding: '4px 12px', fontSize: '13px', fontWeight: 500 }}>
                  {selectedNote.subject || 'General'}
                </span>
                <h2 style={{ fontSize: '24px' }}>{selectedNote.title}</h2>
                <div className="note-date" style={{ marginTop: '4px', border: 'none', background: 'transparent', padding: 0 }}>
                  {new Date(selectedNote.created_at).toLocaleDateString()}
                </div>
              </div>
              <button className="btn-icon" onClick={() => { setSelectedNote(null); setNoteSummary(null); }} style={{ alignSelf: 'flex-start', flexShrink: 0 }}>
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="note-content" style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {selectedNote.content || 'No content provided.'}
            </div>

            <div className="modal-actions" style={{ marginTop: '24px', justifyContent: 'flex-start', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px', flex: '1 1 100%' }}>
                <div className="custom-dropdown" style={{ width: '160px' }}>
                  <div 
                    className="form-input custom-dropdown-button" 
                    onClick={() => setTestTypeDropdownOpen(!testTypeDropdownOpen)}
                    style={{ padding: '12px', height: '100%', minHeight: '44px' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{testType === 'mcq' ? 'MCQ Test' : 'One-Word Test'}</span>
                    <ChevronDown size={18} style={{ transform: testTypeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                  </div>

                  {testTypeDropdownOpen && (
                    <div className="custom-dropdown-menu">
                      <div
                        className={`custom-dropdown-item ${testType === 'mcq' ? 'active' : ''}`}
                        onClick={() => { setTestType('mcq'); setTestTypeDropdownOpen(false); }}
                      >
                        MCQ Test
                      </div>
                      <div
                        className={`custom-dropdown-item ${testType === 'one-word' ? 'active' : ''}`}
                        onClick={() => { setTestType('one-word'); setTestTypeDropdownOpen(false); }}
                      >
                        One-Word Test
                      </div>
                    </div>
                  )}
                </div>
                <button 
                  className="btn-ai" 
                  onClick={() => handleGenerateFlashcards(selectedNote)}
                  disabled={isGenerating}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Sparkles size={18} />
                  {isGenerating ? 'Generating...' : 'Generate Flashcards'}
                </button>
              </div>
              
              <button 
                className="hover:opacity-90 hover:-translate-y-[1px] transition-all" 
                onClick={() => handleSummarizeNote(selectedNote)}
                disabled={isSummarizing}
                style={{ 
                  flex: '1 1 100%', 
                  justifyContent: 'center', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 20px', 
                  background: 'linear-gradient(135deg, #10b981, #059669)', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '10px', 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  cursor: 'pointer' 
                }}
              >
                <FileText size={18} />
                {isSummarizing ? 'Summarizing...' : 'Summarize Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {noteSummary && (
        <div className="modal-overlay" onClick={() => setNoteSummary(null)} style={{ zIndex: 1000 }}>
          <div className="modal text-foreground" style={{ maxWidth: '650px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Sparkles size={24} style={{ color: '#10b981' }} /> AI Summary
              </h2>
              <button className="btn-icon" onClick={() => setNoteSummary(null)} style={{ alignSelf: 'flex-start', flexShrink: 0 }}>
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="note-content" style={{ flex: 1, overflowY: 'auto', padding: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', fontSize: '15px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
              {noteSummary}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px', justifyContent: 'flex-end', display: 'flex' }}>
              <button className="btn-secondary" onClick={() => setNoteSummary(null)}>
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setPreviewImage(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Note</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); setPreviewImage(null); }} style={{ flexShrink: 0 }}>
                <X size={20} strokeWidth={2.5} />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  <label style={{ margin: 0 }}>Content</label>
                  <label className="btn-ai" style={{ color: '#ffffff', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', margin: 0, opacity: isTranscribing ? 0.7 : 1 }}>
                    <ImageIcon size={14} />
                    {isTranscribing ? 'Transcribing...' : 'Scan Image'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleTranscribeImage}
                      disabled={isTranscribing}
                    />
                  </label>
                </div>
                <textarea
                  className="form-textarea"
                  placeholder="Start writing your notes here..."
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                {previewImage && (
                  <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
                    <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }} />
                    <button type="button" onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
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
