import React, { useState, useEffect } from 'react';
import { Web3Provider } from './context/Web3Context';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { VaultView } from './components/VaultView';
import { EstrategiaIAView } from './components/EstrategiaIAView';
import { ActividadView } from './components/ActividadView';
import { ComoFuncionaView } from './components/ComoFuncionaView';

export function AppContent() {
  const [activeTab, setActiveTab] = useState('home');

  // Al cambiar de pestaña, vuelve al inicio de la página (antes se quedaba a media altura)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans antialiased flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 container mx-auto py-6">
        {activeTab === 'home' && <HomeView onNavigate={setActiveTab} />}
        {activeTab === 'vault' && <VaultView />}
        {activeTab === 'estrategia' && <EstrategiaIAView />}
        {activeTab === 'actividad' && <ActividadView />}
        {activeTab === 'como-funciona' && <ComoFuncionaView onNavigate={setActiveTab} />}
      </main>

      <Footer />
    </div>
  );
}

export function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}

export default App;
