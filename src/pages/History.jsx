import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { History as HistoryIcon, Clock, CheckCircle, XCircle, TrendingUp, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

function History() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  async function fetchHistory() {
    setLoading(true);
    
    // Fetch study sessions and join with decks table to get deck titles
    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        *,
        decks ( title, subject )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setSessions(data || []);
    }
    
    setLoading(false);
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Prepare chart data (reverse so oldest is first, up to 10 latest)
  const chartData = sessions.length > 0 ? [...sessions]
    .slice(0, 10)
    .reverse()
    .map(session => ({
      date: new Date(session.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      accuracy: session.cards_reviewed > 0 
        ? Math.round((session.correct_count / session.cards_reviewed) * 100) 
        : 0,
      Correct: session.correct_count || 0,
      Incorrect: session.incorrect_count || 0
    })) : [
      { date: 'Mon', accuracy: 0, Correct: 0, Incorrect: 0 },
      { date: 'Tue', accuracy: 0, Correct: 0, Incorrect: 0 },
      { date: 'Wed', accuracy: 0, Correct: 0, Incorrect: 0 },
      { date: 'Thu', accuracy: 0, Correct: 0, Incorrect: 0 },
      { date: 'Fri', accuracy: 0, Correct: 0, Incorrect: 0 },
    ];

  return (
    <div>
      <div className="page-header">
        <h1>Test History</h1>
        <p>Track your past flashcard study sessions and performance</p>
      </div>

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <TrendingUp size={20} color="#3b82f6" />
              <h2 style={{ fontSize: '18px', color: '#f1f5f9' }} className="history-title">Performance Trend</h2>
            </div>
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} dx={-10} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} formatter={(value) => [`${value}% Accuracy`, 'Score']} />
                  <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#60a5fa' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <BarChart2 size={20} color="#a855f7" />
              <h2 style={{ fontSize: '18px', color: '#f1f5f9' }} className="history-title">Correct vs Incorrect</h2>
            </div>
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Correct" stackId="a" fill="#4ade80" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Incorrect" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <p className="empty-state">Loading history...</p>
        ) : sessions.length === 0 ? (
          <p className="empty-state">No test history found. Go study some decks!</p>
        ) : (
          sessions.map((session) => {
            const accuracy = session.cards_reviewed > 0 
              ? Math.round((session.correct_count / session.cards_reviewed) * 100) 
              : 0;

            return (
              <div key={session.id} className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', borderLeft: `4px solid ${accuracy >= 80 ? '#4ade80' : accuracy >= 50 ? '#fb923c' : '#f87171'}` }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '1 1 300px' }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '14px', 
                    background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <HistoryIcon size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#f1f5f9', fontWeight: '600' }} className="history-title">
                      {session.decks?.title || 'Deleted Deck'}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> {new Date(session.started_at).toLocaleDateString()}
                      </span>
                      <span>Duration: {formatDuration(session.duration_seconds)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Correct</div>
                    <div style={{ color: '#4ade80', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                      <CheckCircle size={16} /> {session.correct_count}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Incorrect</div>
                    <div style={{ color: '#f87171', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                      <XCircle size={16} /> {session.incorrect_count}
                    </div>
                  </div>

                  <div style={{ 
                    background: accuracy >= 80 ? 'rgba(34, 197, 94, 0.1)' : accuracy >= 50 ? 'rgba(249, 115, 22, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: accuracy >= 80 ? '#4ade80' : accuracy >= 50 ? '#fb923c' : '#f87171',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    border: `1px solid ${accuracy >= 80 ? 'rgba(34, 197, 94, 0.3)' : accuracy >= 50 ? 'rgba(249, 115, 22, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {accuracy}% Score
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
      <style>{`
        .light-theme .history-title {
          color: #0f172a !important;
        }
      `}</style>
    </div>
  );
}

export default History;
