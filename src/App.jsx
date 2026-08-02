import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UnifiedBook from './pages/UnifiedBook';
import NamePrompt from './components/Layout/NamePrompt';

import './styles/index.css';
import './styles/book.css';
import './styles/questions.css';
import './styles/mindmap.css';
import './styles/admin.css';
import './styles/print.css';
import './styles/responsive.css';

function App() {
  const [studentName, setStudentName] = useState(() => {
    try {
      const profile = localStorage.getItem('book_student_profile');
      return profile ? JSON.parse(profile).name : null;
    } catch { return null; }
  });

  if (!studentName) {
    return <NamePrompt onSubmit={setStudentName} />;
  }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<UnifiedBook />} />
      </Routes>
    </Router>
  );
}

export default App;
