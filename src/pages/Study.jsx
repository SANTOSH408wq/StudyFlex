import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Study.css';

function Study() {
  const { user } = useAuth();
  const { deckId } = useParams();
  
  const [deck, setDeck] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentCard, setCurrentCard] = useState(0);
  const [score, setScore] = useState({ correct: 0, incorrect: 0, skipped: 0 });
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // MCQ state
  const [selectedOption, setSelectedOption] = useState(null);
  // One-word state
  const [textInput, setTextInput] = useState('');
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);

  const [isAdvancing, setIsAdvancing] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  useEffect(() => {
    if (user && deckId) {
      fetchDeckAndCards();
    }
  }, [user, deckId]);

  async function fetchDeckAndCards() {
    setLoading(true);
    
    // Fetch deck
    const { data: deckData } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .single();
      
    if (deckData) {
      setDeck(deckData);
    }
    
    // Fetch flashcards
    const { data: cardsData } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });
      
    if (cardsData) {
      // Parse back_content for MCQ options if it exists
      const parsedCards = cardsData.map(card => {
        let options = [];
        let correctAnswer = card.back_content;
        
        try {
          const parsed = JSON.parse(card.back_content);
          if (parsed.options && parsed.correctAnswer) {
            options = parsed.options;
            correctAnswer = parsed.correctAnswer;
          } else if (parsed.correctAnswer) {
            correctAnswer = parsed.correctAnswer;
          }
        } catch (e) {
          // fallback
          correctAnswer = card.back_content;
        }
        
        return {
          ...card,
          options,
          correctAnswer
        };
      });
      setFlashcards(parsedCards);
      setSessionStartTime(Date.now());
    }
    
    setLoading(false);
  }

  const handleTextSubmit = () => {
    if (isAdvancing || !textInput.trim()) return;
    
    setIsAdvancing(true);
    const correct = currentFlashcard.correctAnswer.toLowerCase();
    const userAns = textInput.toLowerCase().trim();
    
    // Simple matching (can be improved with fuzzy matching if needed)
    const isCorrect = correct.includes(userAns) || userAns.includes(correct);
    
    setIsAnswerRevealed(true);
    setIsAnswerCorrect(isCorrect);
    
    const newScore = {
      ...score,
      correct: isCorrect ? score.correct + 1 : score.correct,
      incorrect: !isCorrect ? score.incorrect + 1 : score.incorrect,
    };
    setScore(newScore);

    setTimeout(() => {
      advanceNextCard(newScore);
    }, 2000);
  };

  const advanceNextCard = (newScore) => {
    setSelectedOption(null);
    setTextInput('');
    setIsAnswerRevealed(false);
    setIsAnswerCorrect(null);
    setIsAdvancing(false);
    setCurrentCard(prev => prev + 1);
    
    if (currentCard + 1 >= flashcards.length) {
      saveSession(newScore);
    }
  };

  const handleOptionClick = (option) => {
    if (isAdvancing) return; 
    
    setSelectedOption(option);
    setIsAdvancing(true);
    
    const isCorrect = option === flashcards[currentCard].correctAnswer;
    const newScore = {
      ...score,
      correct: isCorrect ? score.correct + 1 : score.correct,
      incorrect: !isCorrect ? score.incorrect + 1 : score.incorrect,
    };
    
    setScore(newScore);

    setTimeout(() => {
      advanceNextCard(newScore);
    }, 1500);
  };

  const saveSession = async (finalScore) => {
    if (sessionSaved) return;
    setSessionSaved(true);
    
    const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
    
    const { data, error } = await supabase.from('study_sessions').insert([{
      user_id: user.id,
      deck_id: deckId,
      cards_reviewed: flashcards.length,
      correct_count: finalScore.correct,
      incorrect_count: finalScore.incorrect,
      duration_seconds: durationSeconds
    }]).select();

    if (error) {
      console.error("Error saving session:", error);
      alert("Failed to save your session to the database: " + error.message);
    } else {
      console.log("Session saved successfully:", data);
    }
  };

  const resetSession = () => {
    setCurrentCard(0);
    setScore({ correct: 0, incorrect: 0, skipped: 0 });
    setSessionStartTime(Date.now());
    setSessionSaved(false);
  };

  if (loading) {
    return <div className="page-header"><p>Loading flashcards...</p></div>;
  }

  if (flashcards.length === 0) {
    return (
      <div className="page-header">
        <div style={{ marginBottom: 16 }}>
          <Link to="/decks" className="btn-ghost">
            <ArrowLeft size={18} />
            Back to Decks
          </Link>
        </div>
        <h2>No flashcards found</h2>
        <p>This deck doesn't have any flashcards yet.</p>
      </div>
    );
  }

  // Completion Screen
  if (currentCard >= flashcards.length) {
    const accuracy = Math.round((score.correct / flashcards.length) * 100);
    return (
      <div>
        <div className="completion-card glass-card">
          <Trophy size={48} color="#f97316" />
          <h2>Session Complete! 🎉</h2>
          <p>
            You scored {score.correct} correct and {score.incorrect} incorrect out of {flashcards.length} cards.
          </p>
          <div style={{ margin: '20px 0', fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>
            {accuracy}% Accuracy
          </div>
          <div className="completion-actions">
            <button className="btn-primary" onClick={resetSession}>
              Study Again
            </button>
            <Link to="/decks" className="btn-secondary">
              Back to Decks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentCard / flashcards.length) * 100);
  const currentFlashcard = flashcards[currentCard];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Link to="/decks" className="btn-ghost">
            <ArrowLeft size={18} />
            Back to Decks
          </Link>
          <button className="btn-ai">
            <Sparkles size={18} />
            Generate More Cards
          </button>
        </div>
        <h1>{deck?.title || 'Study Session'}</h1>
        <p>Reviewing {flashcards.length} flashcards</p>
      </div>

      {/* Study Progress */}
      <div className="study-progress">
        <div className="study-progress-text">
          <span>Question {currentCard + 1} of {flashcards.length}</span>
          <span>{progressPercent}% complete</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Flashcard Interface */}
      <div className="flashcard-wrapper" style={{ display: 'block', maxWidth: '800px', margin: '0 auto' }}>
        <div className="glass-card" style={{ padding: '40px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          
          <div className="flashcard-label" style={{ marginBottom: '16px', color: '#94a3b8', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' }}>
            QUESTION
          </div>
          
          <h2 style={{ fontSize: '24px', lineHeight: '1.5', marginBottom: '32px', color: '#f1f5f9' }} className="mcq-question">
            {currentFlashcard.front_content}
          </h2>

          {currentFlashcard.options && currentFlashcard.options.length > 0 ? (
            <>
            <div className="mcq-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
              {currentFlashcard.options.map((option, index) => {
                let btnStyle = {
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#e2e8f0',
                  fontSize: '16px',
                  textAlign: 'left',
                  cursor: isAdvancing ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'Outfit', sans-serif"
                };

                if (selectedOption !== null) {
                  if (option === currentFlashcard.correctAnswer) {
                    btnStyle.background = 'rgba(34, 197, 94, 0.2)';
                    btnStyle.borderColor = 'rgba(34, 197, 94, 0.5)';
                    btnStyle.color = '#4ade80';
                  } else if (option === selectedOption) {
                    btnStyle.background = 'rgba(239, 68, 68, 0.2)';
                    btnStyle.borderColor = 'rgba(239, 68, 68, 0.5)';
                    btnStyle.color = '#f87171';
                  } else {
                    btnStyle.opacity = '0.5';
                  }
                }

                return (
                  <button
                    key={index}
                    style={btnStyle}
                    onClick={() => handleOptionClick(option)}
                    disabled={isAdvancing}
                    className={selectedOption === null ? "mcq-option-hover" : ""}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            
            {selectedOption !== null && (
              <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                borderRadius: '12px', 
                background: selectedOption === currentFlashcard.correctAnswer ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${selectedOption === currentFlashcard.correctAnswer ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: selectedOption === currentFlashcard.correctAnswer ? '#4ade80' : '#f87171',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {selectedOption === currentFlashcard.correctAnswer 
                  ? 'Correct! 🎉' 
                  : `Incorrect. The correct answer was: ${currentFlashcard.correctAnswer}`}
              </div>
            )}
            </>
          ) : (
            <div className="one-word-interface" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Type your answer here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                disabled={isAdvancing}
                autoFocus
              />
              <button 
                className="btn-primary" 
                onClick={handleTextSubmit}
                disabled={isAdvancing || !textInput.trim()}
                style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
              >
                Submit Answer
              </button>
              
              {isAnswerRevealed && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: isAnswerCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isAnswerCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: isAnswerCorrect ? '#4ade80' : '#f87171',
                  textAlign: 'center'
                }}>
                  {isAnswerCorrect ? 'Correct! 🎉' : `Incorrect. The answer was: ${currentFlashcard.correctAnswer}`}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      
      <style>{`
        .mcq-option-hover:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.2) !important;
          transform: translateY(-2px);
        }
        .light-theme .mcq-question {
          color: #0f172a !important;
        }
        .light-theme .mcq-option-hover {
          color: #0f172a !important;
          background: rgba(0,0,0,0.03) !important;
          border-color: rgba(0,0,0,0.1) !important;
        }
        .light-theme .mcq-option-hover:hover {
          background: rgba(0,0,0,0.06) !important;
          border-color: rgba(0,0,0,0.15) !important;
        }
      `}</style>
    </div>
  );
}

export default Study;
