
import React from 'react';
import { Screen } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentScreen, onNavigate, title }) => {
  const isHome = currentScreen === Screen.HOME || currentScreen === Screen.LOGIN;

  const handleBack = () => {
    if (currentScreen === Screen.ABOUT) {
      onNavigate(Screen.LOGIN);
    } else if (currentScreen !== Screen.DASHBOARD && currentScreen !== Screen.HOME && currentScreen !== Screen.LOGIN) {
      onNavigate(Screen.DASHBOARD);
    } else {
      onNavigate(Screen.LOGIN);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="pattern-border shadow-sm"></div>
      
      <header className="w-full max-w-2xl bg-white/95 backdrop-blur-md border-b-2 border-amber-100 sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          {/* Back/Home Controls */}
          {!isHome && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleBack}
                className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white hover:bg-slate-800 rounded-[1rem] transition-all active:scale-90 shadow-md border-[3px] border-black"
                title="Go back"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
            </div>
          )}
          
          {/* Aesthetic Combined KLEARN Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div 
              className="relative group cursor-pointer" 
              onClick={() => onNavigate(Screen.HOME)}
            >
              <div className="relative px-2 py-1 bg-black border-2 border-amber-400 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/20 to-white/10"></div>
                <div className="flex items-baseline relative z-10 select-none">
                  <span className="text-amber-400 font-black text-xl kadazan-title leading-none">K</span>
                  <span className="text-white font-black text-[9px] tracking-[-0.05em] uppercase opacity-90 ml-[1px]">LEARN</span>
                </div>
              </div>
            </div>
            
            <div className="max-w-[140px] sm:max-w-none">
              <h1 className="text-[10px] sm:text-[11px] font-black text-slate-400 tracking-wider uppercase leading-tight">
                Welcome to <span className="text-slate-900">K Learn</span> where <br/>
                <span className="text-amber-600">language bonds us</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Minimalist Right Decoration */}
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 tracking-widest uppercase">
          <span className="hidden sm:inline">Sabah Heritage</span>
          <div className="w-2 h-2 bg-red-600 rotate-45"></div>
        </div>
      </header>

      <main className="w-full max-w-2xl p-6 flex-1 flex flex-col">
        {children}
      </main>

      <footer className="w-full max-w-2xl p-8 text-center space-y-4">
        <div className="flex justify-center items-center gap-6">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
          <img src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" className="w-6 h-6 grayscale opacity-30" alt="Rice" />
          <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
        </div>
        <p className="text-[#000000] font-black text-xs tracking-[0.3em] uppercase opacity-80">Mogiom Kohunan Kadazan<br/><span className="text-[9px] tracking-normal opacity-70">(Seeking Kadazan Knowledge)</span></p>
        <p className="text-slate-400 text-[10px] font-bold">BOROS KADAZAN SABAH &copy; {new Date().getFullYear()}</p>
        <div className="pattern-border opacity-10 mt-4"></div>
      </footer>
    </div>
  );
};

