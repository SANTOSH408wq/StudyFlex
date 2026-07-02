# StudyFlex 🎓

StudyFlex is a modern, responsive web application designed to supercharge your learning journey. Built with React and Supabase, it features an elegant glassmorphism design and provides powerful tools for note-taking, creating flashcard decks, and tracking your study analytics.

## 🚀 Features

- **Dynamic Dashboard**: Get a quick overview of your study progress, active decks, and recent activities.
- **Smart Notes**: Organize your study materials with a beautiful note-taking interface.
- **Flashcard Decks**: Create, manage, and study custom flashcards.
- **Interactive Study Mode**: Test your knowledge with a flip-card interface, complete with progress tracking and success rates.
- **Analytics & History**: Visualize your learning patterns and review past test history.
- **Fully Responsive**: A seamless experience across desktops, tablets, and smartphones.
- **Authentication**: Secure email/password and Google OAuth login powered by Supabase.

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/) (v18)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router](https://reactrouter.com/) (v6)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **Styling**: Vanilla CSS (Custom Liquid Dark/Light Glassmorphism theme)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: [Vercel](https://vercel.com/)

## ⚙️ Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/studyflex.git
   cd studyflex
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root of your project and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## 🌐 Deployment
This project is configured to be deployed easily on [Vercel](https://vercel.com/). 
1. Connect your repository to Vercel.
2. Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Vercel Environment Variables.
3. Deploy!

*(Note: Ensure your Vercel deployment URL is added to your Supabase project's Authentication Redirect URLs for Google Login to work correctly).*

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
