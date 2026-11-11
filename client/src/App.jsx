import React, { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import PlaygroundPage from './pages/PlaygroundPage';
import TrafficPage from './pages/TrafficPage';
import NotFoundPage from './pages/NotFoundPage';
import { healthService } from './services/health.service';

export default function App() {
  // Health state shared across layout
  const [health, setHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHealth = useCallback(async () => {
    setIsRefreshing(true);
    const result = await healthService.getGatewayHealth();
    setHealth(result);
    setLastUpdated(new Date().toLocaleTimeString());
    setIsRefreshing(false);
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 6000);
    return () => clearInterval(timer);
  }, [fetchHealth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Layout wrapper with nested routes */}
        <Route
          element={
            <DashboardLayout
              health={health}
              onRefresh={fetchHealth}
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
            />
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="playground" element={<PlaygroundPage />} />
          <Route path="traffic" element={<TrafficPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}


