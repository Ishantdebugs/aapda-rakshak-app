import React, { useState } from "react";
import { translations } from "../utils/translations";
import { ShieldAlert, Users, Award, Languages, Lock, Mail, Eye, EyeOff, User, Phone } from "lucide-react";

export default function Onboarding({ language, setLanguage, setRole, setUserProfile, onComplete }) {
  const t = translations[language];

  // Steps: 'role_selection' or 'gmail_auth'
  const [step, setStep] = useState("role_selection");
  const [selectedRoleId, setSelectedRoleId] = useState("citizen");
  
  // Gmail Form States
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: "citizen",
      name: t.citizenName,
      nameHi: t.citizenNameHi,
      icon: Users,
      desc: t.citizenDesc,
      borderColor: "border-slate-800 hover:border-emerald-500",
      iconColor: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50",
      accentGlow: "hover:shadow-emerald-900/10",
      accentColor: "emerald"
    },
    {
      id: "responder",
      name: t.responderName,
      nameHi: t.responderNameHi,
      icon: Award,
      desc: t.responderDesc,
      borderColor: "border-slate-800 hover:border-blue-500",
      iconColor: "text-blue-400 bg-blue-950/50 border-blue-900/50",
      accentGlow: "hover:shadow-blue-900/10",
      accentColor: "blue"
    },
    {
      id: "admin",
      name: t.adminName,
      nameHi: t.adminNameHi,
      icon: ShieldAlert,
      desc: t.adminDesc,
      borderColor: "border-slate-800 hover:border-red-500",
      iconColor: "text-red-400 bg-red-950/50 border-red-900/50",
      accentGlow: "hover:shadow-red-900/10",
      accentColor: "red"
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRoleId(roleId);
    // Autofill names based on selected role for fast testing
    if (roleId === "admin") {
      setName("System Administrator");
      setEmail("admin.rakshak@gmail.com");
      setPhone("+91 99999 11111");
    } else if (roleId === "responder") {
      setName("Rescue Squad Unit 4");
      setEmail("responder.squad4@gmail.com");
      setPhone("+91 88888 22222");
    } else {
      setName("Ramesh Sharma");
      setEmail("ramesh.sharma@gmail.com");
      setPhone("+91 98765 43210");
    }
    setStep("gmail_auth");
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setEmailError("");

    if (!email) {
      setEmailError(language === "hi" ? "कृपया अपना ईमेल दर्ज करें।" : "Please enter your email address.");
      return;
    }

    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setEmailError(language === "hi" ? "केवल @gmail.com ईमेल ही मान्य हैं।" : "Authentication requires a valid @gmail.com address.");
      return;
    }

    if (!name) {
      setEmailError(language === "hi" ? "कृपया अपना नाम दर्ज करें।" : "Please enter your name.");
      return;
    }

    if (!phone) {
      setEmailError(language === "hi" ? "कृपया अपना फोन नंबर दर्ज करें।" : "Please enter your phone number.");
      return;
    }

    setLoading(true);

    // Simulate Google Sign-In authentication latency
    setTimeout(() => {
      setLoading(false);
      setRole(selectedRoleId);
      setUserProfile({
        name,
        email,
        phone,
        role: selectedRoleId,
        avatarInitial: name.charAt(0).toUpperCase()
      });
      onComplete();
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-4">
      {/* Background visual emergency design details */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>

      <div className="max-w-4xl w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Top bar with Language Switcher */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/10 rounded-xl border border-red-500/20">
              <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold font-display tracking-wide uppercase text-white">
                {t.onboardingTitle}
              </h1>
              <p className="text-xs text-red-500 font-semibold tracking-widest uppercase">
                {language === "hi" ? "आपदा प्रबंधन प्रणाली" : "DISASTER EMERGENCY PORTAL"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <Languages className="w-4 h-4 text-slate-400 ml-2" />
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all touch-target ${
                language === "en"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all touch-target ${
                language === "hi"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* STEP 1: Role Selection */}
        {step === "role_selection" && (
          <div className="animate-fadeIn">
            {/* Welcome Section */}
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
                {language === "hi" ? "आपदा रक्षक में आपका स्वागत है" : "Welcome to Aapada Rakshak"}
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
                {t.onboardingSubtitle}
              </p>
            </div>

            {/* Roles Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-4">
              {roles.map((role) => {
                const IconComponent = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className={`group text-left p-6 bg-slate-950/50 hover:bg-slate-950/90 border rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl flex flex-col justify-between items-start h-72 cursor-pointer ${role.borderColor} ${role.accentGlow} touch-target`}
                  >
                    <div>
                      <div className={`p-4 rounded-xl border mb-5 transition-transform group-hover:scale-110 duration-300 ${role.iconColor}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 flex flex-col">
                        <span>{role.name}</span>
                        <span className="text-xs text-slate-500 font-normal mt-0.5">({role.nameHi})</span>
                      </h3>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed mt-2 line-clamp-4">
                        {role.desc}
                      </p>
                    </div>
                    
                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors flex items-center gap-1 mt-4">
                      {language === "hi" ? "जीमेल से लॉग इन" : "Sign in with Gmail"} &rarr;
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-center mt-8 text-xs text-slate-500">
              {language === "hi" 
                ? "सुरक्षित रहें। सुरक्षा प्रसारण प्रणालियों और त्वरित प्रतिक्रिया के लिए जीपीएस की आवश्यकता होती है।" 
                : "Stay alert. Safety broadcast systems and SOS triggers require GPS location metrics for responders."}
            </div>
          </div>
        )}

        {/* STEP 2: Secure Gmail Authentication */}
        {step === "gmail_auth" && (
          <div className="max-w-md mx-auto bg-slate-955/40 p-6 md:p-8 rounded-2xl border border-slate-800 animate-fadeIn">
            {/* Google Identity Logo simulation */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-1 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
                <span className="font-extrabold text-lg text-blue-500 font-sans">G</span>
                <span className="font-extrabold text-lg text-red-500 font-sans">o</span>
                <span className="font-extrabold text-lg text-yellow-500 font-sans">o</span>
                <span className="font-extrabold text-lg text-blue-500 font-sans">g</span>
                <span className="font-extrabold text-lg text-green-500 font-sans">l</span>
                <span className="font-extrabold text-lg text-red-500 font-sans">e</span>
                <span className="text-slate-400 text-xs font-mono ml-2 border-l border-slate-800 pl-2">Sign-In</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-extrabold text-white">
                {language === "hi" ? "जीमेल से लॉग इन करें" : "Sign in with Gmail"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === "hi" 
                  ? `भूमिका: ${roles.find(r => r.id === selectedRoleId)?.name || selectedRoleId}` 
                  : `Role Scope: ${(roles.find(r => r.id === selectedRoleId)?.name || selectedRoleId).toUpperCase()}`}
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {emailError && (
                <div className="text-center text-xs font-bold text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
                  ⚠️ {emailError}
                </div>
              )}

              {/* Name Input */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {language === "hi" ? "पूरा नाम" : "Full Name"}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 text-xs text-white border border-slate-800 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-blue-500"
                    placeholder="E.g., Rajesh Kumar"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Gmail Email Input */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {language === "hi" ? "जीमेल ईमेल पता" : "Gmail Email Address"}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 text-xs text-white border border-slate-800 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="username@gmail.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {language === "hi" ? "फोन नंबर" : "Phone Number"}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-955 text-xs text-white border border-slate-800 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="+91 XXXXX XXXXX"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {language === "hi" ? "जीमेल खाता पासवर्ड" : "Gmail Password"}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 text-xs text-white border border-slate-800 rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Privacy Warning */}
              <div className="text-[10px] text-slate-500 leading-normal bg-slate-950/50 p-3 rounded-xl border border-slate-900/60">
                🔒 Aapada Rakshak requests basic profile scope to activate tactical safety broadcasts, distress networks, and live tracking circles.
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("role_selection")}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 rounded-xl font-bold text-xs transition-colors cursor-pointer text-center"
                  disabled={loading}
                >
                  {language === "hi" ? "पीछे जाएं" : "Back"}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
