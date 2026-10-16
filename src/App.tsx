import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import DetailsPanel from './components/DetailsPanel';
import { usePolling } from './hooks/usePolling';

export default function App() {
  usePolling();

  return (
    <div className="app">
      <Header />
      <div className="layout">
        <Sidebar />
        <div className="map-area">
          <MapView />
        </div>
        <DetailsPanel />
      </div>
    </div>
  );
}
