import React from "react";
import { translations } from "../utils/translations";
import { ShieldAlert, Wifi, WifiOff, Users, Award, Settings, Globe, Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export default function Header({ 
  language, 
  setLanguage, 
  role,
  offline, 
  setOffline,
  userProfile,
  onSignOut
}) {
  const t = translations[language];
  const { theme, toggleTheme } = useTheme();

  // Static role badge config — role is permanently locked to the user's login choice
  const roleMeta = {
    citizen: {
      label: language === "hi" ? "नागरिक" : "Citizen",
      badgeClass: "bg-emerald-950 text-emerald-400 border-emerald-800",
      avatarGradient: "from-emerald-500 to-emerald-700",
      icon: Users
    },
    responder: {
      label: language === "hi" ? "फर्स्ट रेस्पॉन्डर" : "First Responder",
      badgeClass: "bg-blue-950 text-blue-400 border-blue-800",
      avatarGradient: "from-blue-500 to-blue-700",
      icon: Award
    },
    admin: {
      label: language === "hi" ? "एडमिन" : "Admin",
      badgeClass: "bg-red-950 text-red-400 border-red-800",
      avatarGradient: "from-red-500 to-red-700",
      icon: Settings
    }
  };

  const meta = roleMeta[role] || roleMeta.citizen;
  const RoleIcon = meta.icon;

  return (
    <header className="sticky top-0 z-50 bg-slate-50 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-300 dark:border-slate-900 py-4 px-4 md:px-8 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Branding & Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/10 rounded-lg border border-red-500/20">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold font-display tracking-wide uppercase text-slate-900 dark:text-white">
                {t.appName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono tracking-widest border border-slate-200 dark:border-slate-800">
                v1.2
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 tracking-wider font-semibold uppercase">
              {language === "hi" ? "आपदा सुरक्षा कवच" : "TACTICAL DISASTER PROTECTOR"}
            </p>
          </div>
        </div>

        {/* Action Controls Panel */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          
          {/* Offline Blackout Simulator */}
          <button
            onClick={() => setOffline(!offline)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all touch-target cursor-pointer ${
              offline 
                ? "bg-red-950/90 text-red-400 border-red-800 animate-pulse safe-glow" 
                : "bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:text-white"
            }`}
          >
            {offline ? (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span>{t.networkOffline}</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>{t.networkOnline}</span>
              </>
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-500 uppercase border border-slate-300 dark:border-slate-900/50">
              {offline ? t.onlineRestore : t.offlineBlackout}
            </span>
          </button>

          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500 mx-1.5" />
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer touch-target ${
                language === "en" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700" : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer touch-target ${
                language === "hi" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700" : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300"
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Static Role Badge — locked to login, NOT switchable */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold select-none pointer-events-none ${meta.badgeClass}`}>
            <RoleIcon className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wide">{meta.label}</span>
          </div>

          {/* User Auth Profile Indicator & Sign Out */}
          {userProfile && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-end text-right hidden sm:flex">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white leading-none font-sans">
                  {userProfile.name}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-500 font-mono select-all mt-0.5">
                  {userProfile.email}
                </span>
              </div>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-slate-900 dark:text-white shadow-md border border-white/20 select-none bg-gradient-to-br ${meta.avatarGradient}`}
                title={`Signed in as ${userProfile.name} · Role: ${meta.label}`}
              >
                {userProfile.avatarInitial}
              </div>
              <button
                onClick={onSignOut}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-red-400 font-bold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-red-900 transition-all cursor-pointer font-sans"
              >
                {language === "hi" ? "लॉग आउट" : "Sign Out"}
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
