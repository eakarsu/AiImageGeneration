import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Gallery from './pages/Gallery';
import GalleryDetail from './pages/GalleryDetail';
import Prompts from './pages/Prompts';
import PromptDetail from './pages/PromptDetail';
import Styles from './pages/Styles';
import StyleDetail from './pages/StyleDetail';
import History from './pages/History';
import HistoryDetail from './pages/HistoryDetail';
import Generate from './pages/Generate';
import Navbar from './components/Navbar';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Navbar /><Dashboard /></PrivateRoute>} />
        <Route path="/gallery" element={<PrivateRoute><Navbar /><Gallery /></PrivateRoute>} />
        <Route path="/gallery/:id" element={<PrivateRoute><Navbar /><GalleryDetail /></PrivateRoute>} />
        <Route path="/prompts" element={<PrivateRoute><Navbar /><Prompts /></PrivateRoute>} />
        <Route path="/prompts/:id" element={<PrivateRoute><Navbar /><PromptDetail /></PrivateRoute>} />
        <Route path="/styles" element={<PrivateRoute><Navbar /><Styles /></PrivateRoute>} />
        <Route path="/styles/:id" element={<PrivateRoute><Navbar /><StyleDetail /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><Navbar /><History /></PrivateRoute>} />
        <Route path="/history/:id" element={<PrivateRoute><Navbar /><HistoryDetail /></PrivateRoute>} />
        <Route path="/generate" element={<PrivateRoute><Navbar /><Generate /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Navbar /><Profile /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
