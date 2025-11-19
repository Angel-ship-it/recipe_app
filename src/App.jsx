import React, { useState, useEffect } from 'react';
import { Camera, Upload, Settings, ChefHat, RefreshCw, AlertCircle, Check, X, Trash2 } from 'lucide-react';

// --- Helper: Load Tesseract Dynamically ---
const useTesseract = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.Tesseract) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error("Failed to load Tesseract");
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed, though usually we want to keep the lib loaded
    };
  }, []);

  return isLoaded;
};

// --- Components ---

// 1. API Settings Modal
const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey, modelProvider, setModelProvider }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">App Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
                        <select 
                            value={modelProvider}
                            onChange={(e) => setModelProvider(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            <option value="gemini">Google Gemini (Free / Built-in)</option>
                            <option value="deepseek">DeepSeek (Requires Key)</option>
                            <option value="openai">OpenAI (Requires Key)</option>
                        </select>
                    </div>
                    
                    {modelProvider !== 'gemini' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Key is stored locally in your browser. We never see it.
                            </p>
                        </div>
                    )}
                    {modelProvider === 'gemini' && (
                        <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">
                            Using the built-in Gemini model. No key required in this preview!
                        </p>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-medium">
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// 2. OCR Processor
const OcrSection = ({ onTextExtracted }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preview, setPreview] = useState(null);
    const tesseractLoaded = useTesseract();

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!tesseractLoaded) {
            alert("OCR Engine is still loading. Please wait a moment.");
            return;
        }

        setPreview(URL.createObjectURL(file));
        setIsProcessing(true);
        setProgress(0);

        window.Tesseract.recognize(
            file,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.floor(m.progress * 100));
                    }
                }
            }
        ).then(({ data: { text } }) => {
            setIsProcessing(false);
            onTextExtracted(text);
        }).catch(err => {
            console.error(err);
            setIsProcessing(false);
            alert("Failed to read receipt. Please try a clearer image.");
        });
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="mb-4">
                {preview ? (
                    <img src={preview} alt="Receipt" className="h-48 mx-auto object-contain rounded-lg border border-gray-200" />
                ) : (
                    <div className="h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <div className="text-gray-400 flex flex-col items-center">
                            <Camera className="mb-2 opacity-50" />
                            <p className="text-sm">No Image Uploaded</p>
                        </div>
                    </div>
                )}
            </div>

            {isProcessing ? (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    <p className="text-xs text-emerald-600 mt-2 font-bold">Reading Receipt... {progress}%</p>
                </div>
            ) : (
                <label className={`cursor-pointer bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${!tesseractLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Upload />
                    <span>{preview ? 'Upload Different Receipt' : 'Scan Receipt'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={!tesseractLoaded} />
                </label>
            )}
            {!tesseractLoaded && <p className="text-xs text-gray-400 mt-2">Initializing OCR Engine...</p>}
        </div>
    );
};

// 3. Main App Container
export default function App() {
    // State
    // Safe localStorage access for SSR environments
    const [apiKey, setApiKey] = useState('');
    const [modelProvider, setModelProvider] = useState('gemini');
    
    useEffect(() => {
        setApiKey(localStorage.getItem('r2r_api_key') || '');
        setModelProvider(localStorage.getItem('r2r_provider') || 'gemini');
    }, []);

    const [showSettings, setShowSettings] = useState(false);
    const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Plan
    const [extractedText, setExtractedText] = useState('');
    const [mealPlan, setMealPlan] = useState(null);
    const [loadingPlan, setLoadingPlan] = useState(false);

    // Persist Settings
    useEffect(() => {
        if (apiKey) localStorage.setItem('r2r_api_key', apiKey);
        if (modelProvider) localStorage.setItem('r2r_provider', modelProvider);
    }, [apiKey, modelProvider]);

    // AI Generation Logic
    const generatePlan = async () => {
        // Check key only if not using Gemini
        if (modelProvider !== 'gemini' && !apiKey) {
            setShowSettings(true);
            return;
        }

        setLoadingPlan(true);

        const systemPrompt = `
            You are an expert meal planner focused on Zero Food Waste. 
            Analyze the provided grocery receipt text. 
            1. Identify the edible ingredients. 
            2. Create a 3-day meal plan (Breakfast, Lunch, Dinner) that uses these ingredients efficiently.
            3. Prioritize using highly perishable items (meat, berries, greens) on Day 1.
            4. Suggest "Leftover Logic" (e.g., use roast chicken from Day 1 dinner in Day 2 lunch).
            
            Return ONLY valid JSON with this structure:
            {
                "pantry_summary": ["item1", "item2"],
                "days": [
                    {
                        "day": "Day 1",
                        "focus": "Eat the Fresh Stuff",
                        "meals": {
                            "breakfast": { "name": "...", "ingredients_used": ["..."] },
                            "lunch": { "name": "...", "ingredients_used": ["..."] },
                            "dinner": { "name": "...", "ingredients_used": ["..."] }
                        }
                    },
                    ... (Day 2, Day 3)
                ]
            }
        `;

        try {
            let data;

            if (modelProvider === 'gemini') {
                // Gemini API Call
                const geminiKey = apiKey || ""; // Use provided key or fallback to env
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`;
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: systemPrompt + "\n\n" + `Here is the receipt text: \n\n${extractedText}` }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || `Gemini API Error: ${response.statusText}`);
                }
                
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Empty response from Gemini");
                setMealPlan(JSON.parse(text));

            } else {
                // DeepSeek / OpenAI Compatible Call
                const endpoint = modelProvider === 'deepseek' 
                    ? 'https://api.deepseek.com/chat/completions' 
                    : 'https://api.openai.com/v1/chat/completions';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelProvider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `Here is the receipt text: \n\n${extractedText}` }
                        ],
                        response_format: { type: "json_object" } 
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || `API Error ${response.status}: ${response.statusText}`);
                }
                
                const resData = await response.json();
                const jsonContent = JSON.parse(resData.choices[0].message.content);
                setMealPlan(jsonContent);
            }

            setStep(3);

        } catch (error) {
            console.error(error);
            alert(`Generation Failed: ${error.message}`);
        } finally {
            setLoadingPlan(false);
        }
    };

    // --- Render Steps ---

    const renderStep1 = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800">Upload Receipt</h2>
                <p className="text-gray-500">Snap a photo of your grocery haul.</p>
            </div>
            <OcrSection onTextExtracted={(text) => { setExtractedText(text); setStep(2); }} />
            
            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 border border-blue-100">
                <AlertCircle className="text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Flatten the receipt and ensure good lighting for best results with the free OCR engine.
                </p>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800">Review Items</h2>
                <p className="text-gray-500">Edit the text if the scanner missed anything.</p>
            </div>

            <div className="relative">
                <textarea 
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-sm shadow-sm outline-none transition"
                    placeholder="Receipt text will appear here..."
                />
                <div className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 rounded text-xs text-gray-500 font-bold border">
                    {extractedText.length} chars
                </div>
            </div>

            <button 
                onClick={generatePlan}
                disabled={loadingPlan}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loadingPlan ? (
                    <>
                        <RefreshCw className="animate-spin" /> Generating Plan...
                    </>
                ) : (
                    <>
                        <ChefHat /> Create Meal Plan
                    </>
                )}
            </button>
            
            <button onClick={() => setStep(1)} className="w-full text-gray-500 py-2 hover:text-gray-800 transition">Back to Scan</button>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Your Plan</h2>
                <button onClick={() => setStep(1)} className="text-sm text-emerald-600 font-medium hover:text-emerald-700">New Scan</button>
            </div>

            {/* Pantry Summary */}
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <h3 className="text-indigo-900 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Detected Ingredients
                </h3>
                <div className="flex flex-wrap gap-2">
                    {mealPlan.pantry_summary.map((item, i) => (
                        <span key={i} className="px-2 py-1 bg-white text-indigo-700 text-xs rounded border border-indigo-200 shadow-sm">
                            {item}
                        </span>
                    ))}
                </div>
            </div>

            {/* Days */}
            <div className="space-y-6">
                {mealPlan.days.map((day, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">{day.day}</h3>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                {day.focus}
                            </span>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Breakfast */}
                            <div className="flex gap-4">
                                <div className="w-16 text-xs font-bold text-gray-400 uppercase py-1">Break<br/>fast</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800">{day.meals.breakfast.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">Uses: {day.meals.breakfast.ingredients_used.join(", ")}</p>
                                </div>
                            </div>
                            {/* Lunch */}
                            <div className="flex gap-4 border-t border-gray-50 pt-4">
                                <div className="w-16 text-xs font-bold text-gray-400 uppercase py-1">Lunch</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800">{day.meals.lunch.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">Uses: {day.meals.lunch.ingredients_used.join(", ")}</p>
                                </div>
                            </div>
                            {/* Dinner */}
                            <div className="flex gap-4 border-t border-gray-50 pt-4">
                                <div className="w-16 text-xs font-bold text-gray-400 uppercase py-1">Dinner</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800">{day.meals.dinner.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">Uses: {day.meals.dinner.ingredients_used.join(", ")}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen max-w-md mx-auto bg-gray-50 min-h-screen shadow-2xl flex flex-col font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white px-6 py-4 sticky top-0 z-10 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold shadow-sm">R</div>
                    <h1 className="font-bold text-lg tracking-tight text-gray-900">Recipe to Receipt</h1>
                </div>
                <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-gray-700 transition">
                    <Settings />
                </button>
            </header>

            {/* Main Content */}
            <main className="p-6 flex-grow">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </main>

            {/* Modals */}
            <SettingsModal 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)}
                apiKey={apiKey}
                setApiKey={setApiKey}
                modelProvider={modelProvider}
                setModelProvider={setModelProvider}
            />
        </div>
    );
}