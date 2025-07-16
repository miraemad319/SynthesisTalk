// App.jsx in src folder
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ResearchSession from "./pages/research_session";
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ResearchSession />} />
      </Routes>
    </Router>
  );
}

export default App;
