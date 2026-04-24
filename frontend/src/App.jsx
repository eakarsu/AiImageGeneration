import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
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
import PromptOptimizer from './pages/PromptOptimizer';
import PromptOptimizerDetail from './pages/PromptOptimizerDetail';
import ArtInstructor from './pages/ArtInstructor';
import ArtInstructorDetail from './pages/ArtInstructorDetail';
import StyleTransfer from './pages/StyleTransfer';
import StyleTransferDetail from './pages/StyleTransferDetail';
import Upscaler from './pages/Upscaler';
import UpscalerDetail from './pages/UpscalerDetail';
import VariationGenerator from './pages/VariationGenerator';
import VariationGeneratorDetail from './pages/VariationGeneratorDetail';
import BrandAssetCreator from './pages/BrandAssetCreator';
import BrandAssetCreatorDetail from './pages/BrandAssetCreatorDetail';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function PrivateWithLayout({ children }) {
  return (
    <PrivateRoute>
      <AppLayout>
        <ErrorBoundary>{children}</ErrorBoundary>
      </AppLayout>
    </PrivateRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<PrivateWithLayout><Dashboard /></PrivateWithLayout>} />
        <Route path="/gallery" element={<PrivateWithLayout><Gallery /></PrivateWithLayout>} />
        <Route path="/gallery/:id" element={<PrivateWithLayout><GalleryDetail /></PrivateWithLayout>} />
        <Route path="/prompts" element={<PrivateWithLayout><Prompts /></PrivateWithLayout>} />
        <Route path="/prompts/:id" element={<PrivateWithLayout><PromptDetail /></PrivateWithLayout>} />
        <Route path="/styles" element={<PrivateWithLayout><Styles /></PrivateWithLayout>} />
        <Route path="/styles/:id" element={<PrivateWithLayout><StyleDetail /></PrivateWithLayout>} />
        <Route path="/history" element={<PrivateWithLayout><History /></PrivateWithLayout>} />
        <Route path="/history/:id" element={<PrivateWithLayout><HistoryDetail /></PrivateWithLayout>} />
        <Route path="/generate" element={<PrivateWithLayout><Generate /></PrivateWithLayout>} />
        <Route path="/profile" element={<PrivateWithLayout><Profile /></PrivateWithLayout>} />
        <Route path="/prompt-optimizer" element={<PrivateWithLayout><PromptOptimizer /></PrivateWithLayout>} />
        <Route path="/prompt-optimizer/:id" element={<PrivateWithLayout><PromptOptimizerDetail /></PrivateWithLayout>} />
        <Route path="/art-instructor" element={<PrivateWithLayout><ArtInstructor /></PrivateWithLayout>} />
        <Route path="/art-instructor/:id" element={<PrivateWithLayout><ArtInstructorDetail /></PrivateWithLayout>} />
        <Route path="/style-transfer" element={<PrivateWithLayout><StyleTransfer /></PrivateWithLayout>} />
        <Route path="/style-transfer/:id" element={<PrivateWithLayout><StyleTransferDetail /></PrivateWithLayout>} />
        <Route path="/upscaler" element={<PrivateWithLayout><Upscaler /></PrivateWithLayout>} />
        <Route path="/upscaler/:id" element={<PrivateWithLayout><UpscalerDetail /></PrivateWithLayout>} />
        <Route path="/variation-generator" element={<PrivateWithLayout><VariationGenerator /></PrivateWithLayout>} />
        <Route path="/variation-generator/:id" element={<PrivateWithLayout><VariationGeneratorDetail /></PrivateWithLayout>} />
        <Route path="/brand-asset-creator" element={<PrivateWithLayout><BrandAssetCreator /></PrivateWithLayout>} />
        <Route path="/brand-asset-creator/:id" element={<PrivateWithLayout><BrandAssetCreatorDetail /></PrivateWithLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
