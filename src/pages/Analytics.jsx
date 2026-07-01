import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Clock, Target, Zap } from 'lucide-react';
import '../styles/Analytics.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  Legend,
} from 'recharts';



const tooltipStyle = {
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(180,210,240,0.3)',
  borderRadius: '12px',
};

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#eab308'];

function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    cardsStudiedThisWeek: 0,
    totalStudyTimeMinutes: 0,
    avgRetentionRate: 0,
    bestStreak: 0
  });
  
  const [weeklyMinutesData, setWeeklyMinutesData] = useState([
    { day: 'Mon', minutes: 0 }, { day: 'Tue', minutes: 0 }, { day: 'Wed', minutes: 0 },
    { day: 'Thu', minutes: 0 }, { day: 'Fri', minutes: 0 }, { day: 'Sat', minutes: 0 }, { day: 'Sun', minutes: 0 },
  ]);
  const [subjectData, setSubjectData] = useState([{ name: 'None', value: 1 }]);
  const [retentionData, setRetentionData] = useState([
    { week: 'W1', retention: 0 }, { week: 'W2', retention: 0 }, { week: 'W3', retention: 0 }, { week: 'W4', retention: 0 },
  ]);
  const [radarData, setRadarData] = useState([
    { subject: 'Biology', score: 0 }, { subject: 'Physics', score: 0 }, { subject: 'Chemistry', score: 0 },
  ]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  async function fetchAnalytics() {
    setLoading(true);
    const { data: studySessions } = await supabase
      .from('study_sessions')
      .select(`
        *,
        decks ( subject )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: true }); // Ascending for easier streak calc

    if (studySessions && studySessions.length > 0) {
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);

      // Top Stats
      let cardsThisWeek = 0;
      let totalDurationSec = 0;
      let totalCorrect = 0;
      let totalReviewed = 0;
      
      const subjectCounts = {};
      const subjectCorrect = {};
      const subjectReviewed = {};
      const datesStudiedSet = new Set();

      studySessions.forEach(s => {
        const d = new Date(s.started_at);
        datesStudiedSet.add(d.toLocaleDateString());
        
        if (d >= oneWeekAgo) {
          cardsThisWeek += (s.cards_reviewed || 0);
        }
        totalDurationSec += (s.duration_seconds || 0);
        totalCorrect += (s.correct_count || 0);
        totalReviewed += (s.cards_reviewed || 0);

        const subject = s.decks?.subject || 'General';
        subjectCounts[subject] = (subjectCounts[subject] || 0) + (s.cards_reviewed || 0);
        
        subjectCorrect[subject] = (subjectCorrect[subject] || 0) + (s.correct_count || 0);
        subjectReviewed[subject] = (subjectReviewed[subject] || 0) + (s.cards_reviewed || 0);
      });

      const avgRetentionRate = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;
      const totalStudyTimeMinutes = Math.round(totalDurationSec / 60);

      // Best Streak
      const datesStudied = Array.from(datesStudiedSet).map(ds => new Date(ds)).sort((a, b) => a - b);
      let bestStreak = 0;
      let currentStreak = 0;
      let lastDate = null;
      
      datesStudied.forEach(d => {
        if (!lastDate) {
          currentStreak = 1;
        } else {
          const diffTime = Math.abs(d - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          if (diffDays === 1 || diffDays === 0) {
             if (diffDays === 1) currentStreak++;
          } else {
            currentStreak = 1;
          }
        }
        if (currentStreak > bestStreak) bestStreak = currentStreak;
        lastDate = d;
      });

      setStats({
        cardsStudiedThisWeek: cardsThisWeek,
        totalStudyTimeMinutes,
        avgRetentionRate,
        bestStreak
      });

      // Weekly Minutes Chart (Mon - Sun of CURRENT week)
      const weekData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        const secOnDay = studySessions
          .filter(s => new Date(s.started_at).toLocaleDateString() === d.toLocaleDateString())
          .reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
          
        weekData.push({ day: dayLabel, minutes: Math.round(secOnDay / 60) });
      }
      setWeeklyMinutesData(weekData);

      // Subject Distribution (Pie)
      const newSubjectData = Object.keys(subjectCounts).map(sub => ({
        name: sub,
        value: subjectCounts[sub]
      })).filter(item => item.value > 0);
      
      setSubjectData(newSubjectData.length > 0 ? newSubjectData : [{ name: 'None', value: 1 }]);

      // Retention Over Time (Last 4 weeks)
      const retData = [];
      for (let i = 3; i >= 0; i--) {
        const endW = new Date(now);
        endW.setDate(now.getDate() - (i * 7));
        const startW = new Date(endW);
        startW.setDate(endW.getDate() - 6);
        startW.setHours(0,0,0,0);
        const endWEod = new Date(endW);
        endWEod.setHours(23,59,59,999);
        
        let c = 0, r = 0;
        studySessions.forEach(s => {
          const sd = new Date(s.started_at);
          if (sd >= startW && sd <= endWEod) {
            c += (s.correct_count || 0);
            r += (s.cards_reviewed || 0);
          }
        });
        retData.push({
          week: `W${4-i}`,
          retention: r > 0 ? Math.round((c/r)*100) : 0
        });
      }
      setRetentionData(retData);

      // Radar Data
      const newRadarData = Object.keys(subjectReviewed).map(sub => ({
        subject: sub,
        score: subjectReviewed[sub] > 0 ? Math.round((subjectCorrect[sub] / subjectReviewed[sub]) * 100) : 0
      }));
      setRadarData(newRadarData.length > 0 ? newRadarData : [
        { subject: 'Biology', score: 0 }, { subject: 'Physics', score: 0 }, { subject: 'Chemistry', score: 0 }
      ]);
      
    } else {
      setStats({ cardsStudiedThisWeek: 0, totalStudyTimeMinutes: 0, avgRetentionRate: 0, bestStreak: 0 });
    }
    
    setLoading(false);
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>Study Analytics</h1>
        <p>Track your learning progress and identify areas for improvement</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon blue">
            <TrendingUp size={22} />
          </div>
          <div className="stat-value">{loading ? '...' : stats.cardsStudiedThisWeek}</div>
          <div className="stat-label">Cards Studied This Week</div>
          <div className="stat-change positive">Keep it up!</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon green">
            <Clock size={22} />
          </div>
          <div className="stat-value">{loading ? '...' : `${stats.totalStudyTimeMinutes}m`}</div>
          <div className="stat-label">Total Study Time</div>
          <div className="stat-change">Great dedication</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon purple">
            <Target size={22} />
          </div>
          <div className="stat-value">{loading ? '...' : `${stats.avgRetentionRate}%`}</div>
          <div className="stat-label">Avg. Retention Rate</div>
          <div className="stat-change">Across all subjects</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon orange">
            <Zap size={22} />
          </div>
          <div className="stat-value">{loading ? '...' : stats.bestStreak}</div>
          <div className="stat-label">Best Streak</div>
          <div className="stat-change">Can you beat it?</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="content-grid-equal">
        <div className="glass-card chart-card">
          <div className="chart-header">
            <div className="chart-title">Weekly Study Minutes</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyMinutesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.3)" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={tooltipStyle} />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card chart-card">
          <div className="chart-header">
            <div className="chart-title">Subject Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={subjectData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
              >
                {subjectData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="content-grid-equal">
        <div className="glass-card chart-card">
          <div className="chart-header">
            <div className="chart-title">Retention Over Time</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.3)" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[50, 100]}
                tick={{ fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="retention"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ fill: '#22c55e', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card chart-card">
          <div className="chart-header">
            <div className="chart-title">Skills Radar</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(180,210,240,0.4)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#6b7c93', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
