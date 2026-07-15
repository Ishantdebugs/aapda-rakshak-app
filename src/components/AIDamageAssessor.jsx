import React, { useState, useEffect } from "react";
import { translations } from "../utils/translations";
import { Upload, Cpu, AlertTriangle, ShieldCheck, AlertCircle, ShieldAlert } from "lucide-react";

export default function AIDamageAssessor({ language, onTriageResult }) {
  const t = translations[language];

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);

  // Pre-configured mock disaster image cards for testing the AI assessment
  const samples = [
    {
      id: "crack",
      title: language === "hi" ? "क्षतिग्रस्त खंभा (स्तंभ दरार)" : "Severe Structural Crack",
      desc: "Shear failure on load bearing masonry column",
      severity: "high",
      score: 28,
      confidence: "94.8%",
      recommendation: language === "hi" 
        ? "तत्काल खाली करें। संरचना गिरने का खतरा। 50 मीटर सुरक्षा घेरा बनाएं।"
        : "Evacuate building immediately. High risk of localized collapse. Maintain 50m barrier.",
      icon: AlertTriangle,
      color: "border-red-900/40 text-red-500 bg-red-950/20"
    },
    {
      id: "flood",
      title: language === "hi" ? "बाढ़ जलभराव - बेसमेंट" : "Basement Flood Inundation",
      desc: "Water level reaches electrical meters, foundations submerged",
      severity: "medium",
      score: 54,
      confidence: "88.2%",
      recommendation: language === "hi"
        ? "बिजली ग्रिड बंद करें। नींव कमजोर होने का खतरा। पंपिंग बचाव दल शेड्यूल करें।"
        : "Isolate electrical supplies. Foundation wash-out hazard. Schedule high-capacity pump unit.",
      icon: AlertCircle,
      color: "border-amber-900/40 text-amber-500 bg-amber-950/20"
    },
    {
      id: "minor",
      title: language === "hi" ? "दीवार का प्लास्टर उखड़ना" : "Minor Wall Plaster Cracks",
      desc: "Non-structural plaster hairline cracking due to thermal expansion",
      severity: "low",
      score: 85,
      confidence: "96.4%",
      recommendation: language === "hi"
        ? "कोई तत्काल खतरा नहीं। मलबे की सफाई करें और सामान्य निरीक्षण में रखें।"
        : "No immediate structural failure. Standard cleanup. File routine maintenance check.",
      icon: ShieldCheck,
      color: "border-emerald-900/40 text-emerald-500 bg-emerald-950/20"
    }
  ];

  const simulationSteps = [
    language === "hi" ? "छवि से पिक्सेल ग्रिड निकाल रहे हैं..." : "Extracting pixel raster grids...",
    language === "hi" ? "भार वहन करने वाली दीवारों में दरार का विश्लेषण कर रहे हैं..." : "Analyzing shear strain profiles in load-bearing masonry...",
    language === "hi" ? "पानी के स्तर और नींव की कटान का आकलन कर रहे हैं..." : "Estimating water immersion depth & soil erosion metrics...",
    language === "hi" ? "गंभीरता रैंकिंग और प्राथमिकता कतार उत्पन्न की जा रही है..." : "Generating safety triage priority coefficient..."
  ];

  useEffect(() => {
    let timer;
    if (loading) {
      if (loadingStep < simulationSteps.length) {
        timer = setTimeout(() => {
          setLoadingStep(prev => prev + 1);
        }, 800);
      } else {
        setLoading(false);
        const activeSample = samples.find(s => s.id === selectedSample);
        setResult(activeSample);
        // Dispatch result up to update global incidents queue if callback is set
        if (onTriageResult) {
          onTriageResult(activeSample);
        }
      }
    }
    return () => clearTimeout(timer);
  }, [loading, loadingStep]);

  const handleStartAnalysis = (sampleId) => {
    setResult(null);
    setSelectedSample(sampleId);
    setLoadingStep(0);
    setLoading(true);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div className="p-2 bg-red-600/10 rounded-xl border border-red-500/20">
          <Cpu className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
            {t.aiTitle}
          </h3>
          <p className="text-xs text-slate-400">
            {t.aiDesc}
          </p>
        </div>
      </div>

      {/* Main scanning panel */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Upload / Select sample zone */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {language === "hi" ? "चरण 1: मूल्यांकन के लिए तस्वीर चुनें" : "Step 1: Choose Damage Sample for Scan"}
          </label>
          
          <div className="grid gap-3">
            {samples.map((sample) => {
              const IconComp = sample.icon;
              return (
                <button
                  key={sample.id}
                  onClick={() => handleStartAnalysis(sample.id)}
                  disabled={loading}
                  className={`text-left p-3.5 border rounded-xl flex items-center justify-between gap-4 hover:border-slate-600 hover:bg-slate-950/40 transition-all cursor-pointer touch-target ${
                    selectedSample === sample.id ? "bg-slate-950/60 border-red-500/60" : "bg-slate-950/20 border-slate-800"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg border ${sample.color}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{sample.title}</h4>
                      <p className="text-[10px] text-slate-400">{sample.desc}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    sample.severity === "high" ? "bg-red-950/50 text-red-400 border-red-900" :
                    sample.severity === "medium" ? "bg-amber-950/50 text-amber-400 border-amber-900" :
                    "bg-emerald-950/50 text-emerald-400 border-emerald-900"
                  }`}>
                    {sample.severity}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border border-slate-800/80 border-dashed rounded-xl p-4 bg-slate-950/30 text-center relative overflow-hidden">
            <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-[11px] text-slate-400 font-medium">
              {t.aiScanReady}
            </p>
            <span className="text-[9px] px-2 py-0.5 mt-2 inline-block rounded bg-slate-900 text-slate-500 border border-slate-800">
              {language === "hi" ? "फ़ाइल खींचें" : "Drag-Drop Enabled"}
            </span>
          </div>
        </div>

        {/* AI Diagnostics Console display */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between min-h-[220px] relative overflow-hidden">
          
          {/* Active AI Scanning Radar Animation */}
          {loading && (
            <div className="absolute inset-0 bg-red-950/5 flex flex-col items-center justify-center p-4">
              {/* Pulsing scanning rings */}
              <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping"></div>
                <div className="absolute inset-2 rounded-full border border-red-500/35 animate-radar"></div>
                <Cpu className="w-8 h-8 text-red-500 animate-pulse" />
              </div>

              {/* Scanning visual sweep bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-red-500/50 shadow-md animate-scan"></div>

              <div className="text-center space-y-1.5 z-10">
                <p className="text-xs text-red-500 font-extrabold uppercase tracking-widest animate-pulse">
                  {t.aiScanning}
                </p>
                <p className="text-[10px] text-slate-400 font-mono italic max-w-[200px]">
                  {simulationSteps[loadingStep] || "Finalizing triage vector..."}
                </p>
              </div>
            </div>
          )}

          {/* Render Result Report */}
          {!loading && result && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span className="font-display text-xs font-bold text-white uppercase tracking-wider">
                  {t.aiReportTitle}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-[11px] text-slate-400">{t.aiSeverity}</span>
                  <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded ${
                    result.severity === "high" ? "bg-red-950/95 text-red-400 border border-red-800" :
                    result.severity === "medium" ? "bg-amber-950/95 text-amber-400 border border-amber-800" :
                    "bg-emerald-950/95 text-emerald-400 border border-emerald-800"
                  }`}>
                    {result.severity === "high" ? "HIGH (CRITICAL)" : result.severity.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-900">
                    <span className="text-slate-500 block">{t.aiSafetyScore}</span>
                    <span className={`text-sm font-extrabold font-mono ${
                      result.score < 40 ? "text-red-500" : result.score < 70 ? "text-amber-500" : "text-emerald-400"
                    }`}>
                      {result.score}%
                    </span>
                  </div>
                  
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-900">
                    <span className="text-slate-500 block">{t.aiConfidence}</span>
                    <span className="text-sm font-extrabold font-mono text-slate-300">
                      {result.confidence}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">
                    {t.aiPriority}:
                  </span>
                  <p className={`text-xs font-bold leading-normal ${
                    result.severity === "high" ? "text-red-400" :
                    result.severity === "medium" ? "text-amber-400" :
                    "text-emerald-400"
                  }`}>
                    {result.severity === "high" ? t.aiTriageHigh :
                     result.severity === "medium" ? t.aiTriageMedium :
                     t.aiTriageLow}
                  </p>
                </div>

                <div className="p-2 bg-red-950/20 border border-red-950 rounded text-[10px] text-slate-300 leading-normal italic">
                  <strong>Recommendation:</strong> {result.recommendation}
                </div>
              </div>
            </div>
          )}

          {/* Default state */}
          {!loading && !result && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <Cpu className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-xs text-slate-400 font-medium">
                {language === "hi" 
                  ? "मूल्यांकन शुरू करने के लिए बाईं ओर सूची में से एक फोटो चुनें।" 
                  : "Select a damage profile from the list to trigger the AI triage analysis system."}
              </p>
            </div>
          )}

          {/* Console footer metadata info */}
          <div className="text-[9px] text-slate-500 font-mono text-right mt-2 select-none border-t border-slate-900 pt-1.5">
            Model: AapadaNet-ResNet v2.1
          </div>
        </div>

      </div>
    </div>
  );
}
