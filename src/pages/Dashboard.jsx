import { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import { BookOpen, Layers, Target, Flame } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';



function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Week');
  
  const [stats, setStats] = useState({ notes: 0, decks: 0 });
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [avgRetention, setAvgRetention] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [studyData, setStudyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessions) return;
    let data = [];
    const now = new Date();
    
    if (activeTab === 'Week') {
      // Last 7 days including today
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString();
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        const cardsOnDay = sessions
          .filter(s => new Date(s.started_at).toLocaleDateString() === dateStr)
          .reduce((sum, s) => sum + (s.cards_reviewed || 0), 0);
          
        data.push({ day: dayLabel, cards: cardsOnDay });
      }
    } else if (activeTab === 'Month') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() - (i * 7));
        const startOfWeek = new Date(endOfWeek);
        startOfWeek.setDate(endOfWeek.getDate() - 6);
        startOfWeek.setHours(0, 0, 0, 0); // start of day
        const endOfWeekEOD = new Date(endOfWeek);
        endOfWeekEOD.setHours(23, 59, 59, 999); // end of day
        
        const cardsInWeek = sessions
          .filter(s => {
            const sd = new Date(s.started_at);
            return sd >= startOfWeek && sd <= endOfWeekEOD;
          })
          .reduce((sum, s) => sum + (s.cards_reviewed || 0), 0);
          
        data.push({ 
          day: `W${4 - i}`, 
          cards: cardsInWeek 
        });
      }
    } else if (activeTab === 'Year') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        const targetMonth = d.getMonth();
        const targetYear = d.getFullYear();
        
        const cardsInMonth = sessions
          .filter(s => {
            const sd = new Date(s.started_at);
            return sd.getMonth() === targetMonth && sd.getFullYear() === targetYear;
          })
          .reduce((sum, s) => sum + (s.cards_reviewed || 0), 0);
          
        data.push({ day: monthLabel, cards: cardsInMonth });
      }
    }
    
    setStudyData(data);
  }, [activeTab, sessions]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);
    
    // Fetch counts
    const [{ count: notesCount }, { count: decksCount }] = await Promise.all([
      supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('decks').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    ]);

    setStats({ notes: notesCount || 0, decks: decksCount || 0 });

    // Fetch recent notes for activity feed
    const { data: recentNotes } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentNotes) {
      setActivities(recentNotes.map(n => ({
        color: 'blue',
        text: `Created "${n.title}" notes`,
        time: new Date(n.created_at).toLocaleDateString()
      })));
    }

    // Fetch study sessions
    const { data: studySessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });
    
    if (studySessions && studySessions.length > 0) {
      setSessions(studySessions);
      let totalReviewed = 0;
      let totalCorrect = 0;
      studySessions.forEach(s => {
        totalReviewed += s.cards_reviewed || 0;
        totalCorrect += s.correct_count || 0;
      });
      setAvgRetention(totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0);
      
      // Calculate day streak
      const datesStudied = [...new Set(studySessions.map(s => new Date(s.started_at).toLocaleDateString()))];
      
      let streak = 0;
      const todayStr = new Date().toLocaleDateString();
      let currentDate = new Date();
      let hasToday = datesStudied.includes(todayStr);
      let checkDate = new Date();
      
      if (!hasToday) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (!datesStudied.includes(checkDate.toLocaleDateString())) {
           streak = 0;
        } else {
           streak = 1;
           checkDate.setDate(checkDate.getDate() - 1);
        }
      } else {
         streak = 1;
         checkDate.setDate(checkDate.getDate() - 1);
      }
      
      while (streak > 0 && datesStudied.includes(checkDate.toLocaleDateString())) {
         streak++;
         checkDate.setDate(checkDate.getDate() - 1);
      }
      setDayStreak(streak);
    } else {
      setSessions([]);
      setAvgRetention(0);
      setDayStreak(0);
    }

    setLoading(false);
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'Student'}! 👋</h1>
        <p>Here's your study progress overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon blue">
            <BookOpen size={22} />
          </div>
          <div className="stat-value">{loading ? '...' : stats.notes}</div>
          <div className="stat-label">Total Notes</div>
          <div className="stat-change positive">Tracked in real-time</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon green">
            <Layers size={22} />
          </div>
          <div className="stat-value">{loading ? '...' : stats.decks}</div>
          <div className="stat-label">Flashcard Decks</div>
          <div className="stat-change positive">Tracked in real-time</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon purple">
            <Target size={22} />
          </div>
          <div className="stat-value">{loading ? '...' : `${avgRetention}%`}</div>
          <div className="stat-label">Avg. Retention</div>
          <div className="stat-change">Across all sessions</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon orange">
            <Flame size={22} />
          </div>
          <div className="stat-value">{loading ? '...' : dayStreak}</div>
          <div className="stat-label">Day Streak</div>
          <div className="stat-change">Keep it up!</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="glass-card chart-card">
          <div className="chart-header">
            <div className="chart-title">Study Activity</div>
            <div className="tabs">
              {['Week', 'Month', 'Year'].map((tab) => (
                <button
                  key={tab}
                  className={`tab${activeTab === tab ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={studyData}>
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }} 
              />
              <Area type="monotone" dataKey="cards" stroke="#3b82f6" strokeWidth={3} fill="url(#blueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card activity-card">
          <div className="chart-header">
            <div className="chart-title">Recent Activity</div>
          </div>
          <div className="activity-list">
            {loading ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading activity...</p>
            ) : activities.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No recent activity. Create a note or deck!</p>
            ) : (
              activities.map((activity, i) => (
                <div className="activity-item fade-in-up" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={`activity-dot ${activity.color}`}></div>
                  <div className="activity-details">
                    <div className="activity-text">{activity.text}</div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
