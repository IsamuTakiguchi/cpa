import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import { HomePage } from "./pages/Home";
import { SubjectsPage } from "./pages/Subjects";
import { TopicDetailPage } from "./pages/TopicDetail";
import { SessionBuilderPage } from "./pages/SessionBuilder";
import { SessionRunPage } from "./pages/SessionRun";
import { SessionResultPage } from "./pages/SessionResult";
import { ReviewPage } from "./pages/Review";
import { SummariesPage } from "./pages/Summaries";
import { SummaryBuilderPage } from "./pages/SummaryBuilder";
import { SummaryViewPage } from "./pages/SummaryView";
import { HistoryPage } from "./pages/History";
import { SettingsPage } from "./pages/Settings";
import { AuthPage } from "./pages/Auth";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="subjects/:subjectId" element={<SubjectsPage />} />
            <Route path="topics/:topicId" element={<TopicDetailPage />} />
            <Route path="session/new" element={<SessionBuilderPage />} />
            <Route path="session/:sessionId" element={<SessionRunPage />} />
            <Route path="session/:sessionId/result" element={<SessionResultPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="summaries" element={<SummariesPage />} />
            <Route path="summaries/new" element={<SummaryBuilderPage />} />
            <Route path="summaries/:summaryId" element={<SummaryViewPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
