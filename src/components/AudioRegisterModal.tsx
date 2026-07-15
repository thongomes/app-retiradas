import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  X, 
  Check, 
  Loader2, 
  AlertCircle,
  Upload, 
  FileAudio,
  Trash2,
  Info
} from 'lucide-react';
import { MaterialsCount } from '../types';

interface AudioRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: ExtractedData) => void;
}

export interface ExtractedData {
  client?: string;
  type?: string;
  notes?: string;
  materials?: Partial<MaterialsCount>;
  serials?: Record<string, string[]>;
  macs?: Record<string, string[]>;
}

export const AudioRegisterModal: React.FC<AudioRegisterModalProps> = ({
  isOpen,
  onClose,
  onApplyData
}) => {
  // Key configuration from env only
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  // States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [transcriptText, setTranscriptText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedResult, setExtractedResult] = useState<ExtractedData | null>(null);

  // Web Speech recognition state
  const [recognitionActive, setRecognitionActive] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Reset modal state when closed or opened
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setIsRecording(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setUploadedFile(null);
      setTranscriptText('');
      setIsProcessing(false);
      setErrorMessage('');
      setExtractedResult(null);
      setRecognitionActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  // Handle timer for recording
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Setup Web Speech API (Local Fallback)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'pt-BR';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscriptText((prev) => prev + finalTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Permissão para uso de microfone foi negada.');
        }
      };

      rec.onend = () => {
        setRecognitionActive(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startRecording = async () => {
    setErrorMessage('');
    setExtractedResult(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedFile(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all track usages
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Also trigger Web Speech recognition for real-time text if supported
      if (recognitionRef.current) {
        setTranscriptText('');
        try {
          recognitionRef.current.start();
          setRecognitionActive(true);
        } catch (e) {
          console.warn('SpeechRecognition error starting:', e);
        }
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setErrorMessage('Não foi possível acessar o microfone. Verifique as permissões do seu navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    if (recognitionRef.current && recognitionActive) {
      recognitionRef.current.stop();
      setRecognitionActive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    setExtractedResult(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedFile(file);
    setTranscriptText('');
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedFile(null);
    setTranscriptText('');
    setExtractedResult(null);
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Local rule-based parser fallback
  const parseTextLocally = (text: string): ExtractedData => {
    const result: ExtractedData = {
      client: '',
      type: 'Retirada - Inadimplência',
      notes: '',
      materials: {
        "Roteador GIGA": 0,
        "Roteador FAST": 0,
        "ONU": 0,
        "ONT": 0,
        "Conectores": 0
      },
      serials: {},
      macs: {}
    };

    const lower = text.toLowerCase();

    // 1. Client extraction (matches words after "cliente" or "cliente:")
    const clientMatch = text.match(/(?:cliente|cliente:\s*)\s*([A-ZÀ-ÿ][a-zÀ-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zÀ-ÿ]+)*)/i);
    if (clientMatch) {
      result.client = clientMatch[1].trim();
    }

    // 2. Materials quantities
    // Roteador GIGA
    const gigaMatch = lower.match(/(\d+)\s*(?:roteador|roteadores)\s*giga/i) || lower.match(/(?:roteador|roteadores)\s*giga/i);
    if (gigaMatch) {
      result.materials!["Roteador GIGA"] = gigaMatch[1] ? parseInt(gigaMatch[1], 10) : 1;
    }
    // Roteador FAST
    const fastMatch = lower.match(/(\d+)\s*(?:roteador|roteadores)\s*fast/i) || lower.match(/(?:roteador|roteadores)\s*fast/i);
    if (fastMatch) {
      result.materials!["Roteador FAST"] = fastMatch[1] ? parseInt(fastMatch[1], 10) : 1;
    }
    // ONU
    const onuMatch = lower.match(/(\d+)\s*onu/i) || lower.match(/onu/i);
    if (onuMatch) {
      result.materials!["ONU"] = onuMatch[1] ? parseInt(onuMatch[1], 10) : 1;
    }
    // ONT
    const ontMatch = lower.match(/(\d+)\s*ont/i) || lower.match(/ont/i);
    if (ontMatch) {
      result.materials!["ONT"] = ontMatch[1] ? parseInt(ontMatch[1], 10) : 1;
    }
    // Conectores
    const conMatch = lower.match(/(\d+)\s*(?:conector|conectores)/i);
    if (conMatch) {
      result.materials!["Conectores"] = parseInt(conMatch[1], 10);
    }

    // 3. Extract Serial Number (S/N) alphanumeric sequences (usually 8-15 characters)
    const snMatches = text.match(/(?:serial|sn|s\/n|série|número de série)[:\s]*([A-Z0-9-]{6,20})/gi);
    if (snMatches) {
      const foundSns = snMatches.map(m => m.replace(/(?:serial|sn|s\/n|série|número de série)[:\s]*/gi, '').trim().toUpperCase());
      const eqKeys = ["Roteador GIGA", "Roteador FAST", "ONU", "ONT"];
      const activeEq = eqKeys.find(k => (result.materials as any)[k] > 0);
      if (activeEq) {
        result.serials = {
          [activeEq]: foundSns.slice(0, (result.materials as any)[activeEq])
        };
      }
    }

    // 4. Extract MAC addresses (format AA:BB:CC:DD:EE:FF or hex strings)
    const macMatches = text.match(/(?:mac|endereço mac)[:\s]*([0-9A-F]{2}[:-][0-9A-F]{2}[:-][0-9A-F]{2}[:-][0-9A-F]{2}[:-][0-9A-F]{2}[:-][0-9A-F]{2}|[0-9A-F]{12})/gi);
    if (macMatches) {
      const foundMacs = macMatches.map(m => m.replace(/(?:mac|endereço mac)[:\s]*/gi, '').trim().toUpperCase());
      const eqKeys = ["Roteador GIGA", "Roteador FAST", "ONU", "ONT"];
      const activeEq = eqKeys.find(k => (result.materials as any)[k] > 0);
      if (activeEq) {
        result.macs = {
          [activeEq]: foundMacs.slice(0, (result.materials as any)[activeEq])
        };
      }
    }

    // 5. Reasons mapping
    const reasons = {
      'inadimplência': 'Retirada - Inadimplência',
      'insatisfação': 'Retirada - Insatisfação',
      'mudança': 'Retirada - Mudança de cidade',
      'renovado': 'Retirada - Não renovado',
      'viabilidade': 'Retirada - Sem viabilidade',
      'provedor': 'Retirada - Troca de provedor',
      'óbito': 'Retirada - Óbito',
      'cancelado': 'Retirada - Cancelado',
      'cancelamento': 'Retirada - Pedido de cancelamento'
    };
    for (const [kw, full] of Object.entries(reasons)) {
      if (lower.includes(kw)) {
        result.type = full;
        break;
      }
    }

    // Notes
    if (lower.includes('observação') || lower.includes('obs')) {
      const idx = text.search(/observação|obs/i);
      result.notes = text.substring(idx).replace(/observação|obs(?:ervações)?\s*[:\s]*/i, '').trim();
    }

    return result;
  };

  const processAudio = async () => {
    if (!audioBlob && !uploadedFile && !transcriptText) {
      setErrorMessage('Por favor, grave uma mensagem, suba um arquivo de áudio ou digite o texto.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      if (apiKey) {
        // --- Gemini IA Flow ---
        let base64Data = '';
        let mimeType = 'audio/webm';

        if (uploadedFile) {
          mimeType = uploadedFile.type || 'audio/mp3';
          base64Data = await convertBlobToBase64(uploadedFile);
        } else if (audioBlob) {
          base64Data = await convertBlobToBase64(audioBlob);
        }

        const promptText = `Você é um assistente de extração de dados para um sistema de recolhimento de equipamentos de internet.
Analise a mensagem ou o áudio fornecido e extraia as informações de retirada para o seguinte formato JSON exato. Retorne APENAS o JSON puro, sem qualquer formatação de código markdown (como \`\`\`json ou similar), sem textos introdutórios ou finais.
JSON a preencher:
{
  "client": "Nome do cliente extraído",
  "type": "Tipo de retirada (deve obrigatoriamente ser um dos seguintes: 'Retirada - Inadimplência', 'Retirada - Insatisfação', 'Retirada - Mudança de cidade', 'Retirada - Não renovado', 'Retirada - Sem viabilidade', 'Retirada - Troca de provedor', 'Retirada - Óbito', 'Retirada - Drop', 'Retirada - Cancelado', 'Retirada - Troca de endereço', 'Retirada - Troca de local c conexão', 'Retirada - Pedido de cancelamento')",
  "notes": "Qualquer observação adicional",
  "materials": {
    "Roteador GIGA": número,
    "Roteador FAST": número,
    "ONU": número,
    "ONT": número,
    "Conectores": número
  },
  "serials": {
    "Roteador GIGA": ["serial1", ...],
    "Roteador FAST": ["serial1", ...],
    "ONU": ["serial1", ...],
    "ONT": ["serial1", ...]
  },
  "macs": {
    "Roteador GIGA": ["mac1", ...],
    "Roteador FAST": ["mac1", ...],
    "ONU": ["mac1", ...],
    "ONT": ["mac1", ...]
  }
}
REGRAS IMPORTANTES:
- NÃO EXTRAIA O ENDEREÇO. Ignore qualquer menção a endereço residencial, ruas, números ou bairros no JSON.
- Se o cliente for mencionado, coloque o nome dele em 'client'.
- Se o motivo do recolhimento for mencionado, classifique-o na categoria correspondente do campo 'type'.
- Tente inferir a quantidade de equipamentos. Os únicos equipamentos aceitos são 'Roteador GIGA', 'Roteador FAST', 'ONU', 'ONT', e 'Conectores'.
- Associe quaisquer números de série (S/N) e endereços MAC correspondentes mencionados aos seus respectivos equipamentos em 'serials' e 'macs'.
- Retorne valor padrão (vazio "" ou 0) para o que não for explicitamente mencionado ou detectado.
`;

        // We can send either the transcript text (if available and no audio blob) or the native audio data
        let body: any;
        if (base64Data) {
          body = {
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  },
                  {
                    text: promptText
                  }
                ]
              }
            ]
          };
        } else {
          // If the user only has the transcript text
          body = {
            contents: [
              {
                parts: [
                  {
                    text: `${promptText}\n\nTexto a analisar: "${transcriptText}"`
                  }
                ]
              }
            ]
          };
        }

        const model = 'gemini-1.5-flash';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Erro da API Gemini: ${response.status}`);
        }

        const resData = await response.json();
        const outputText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Sanitize response to isolate JSON
        let cleanJsonStr = outputText.trim();
        if (cleanJsonStr.startsWith('```')) {
          cleanJsonStr = cleanJsonStr.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        try {
          const parsed = JSON.parse(cleanJsonStr) as ExtractedData;
          setExtractedResult(parsed);
        } catch (parseErr) {
          console.error('Error parsing JSON from Gemini:', outputText);
          throw new Error('Falha ao interpretar a resposta da inteligência artificial. Tente novamente.');
        }

      } else {
        // --- Web Speech + Local Fallback Flow ---
        if (!transcriptText) {
          throw new Error('A transcrição local falhou ou está vazia. Sem chave do Gemini, digite o texto ou utilize gravação de voz em tempo real.');
        }
        
        const parsed = parseTextLocally(transcriptText);
        setExtractedResult(parsed);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Ocorreu um erro ao processar o áudio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (extractedResult) {
      onApplyData(extractedResult);
      onClose();
    }
  };

  const formatSeconds = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-brand-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-brand-border flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#07303d] border-b border-brand-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-brand-accent animate-pulse" />
            <h3 className="font-semibold text-white">Preenchimento por Áudio / Voz</h3>
          </div>
          <button
            onClick={onClose}
            className="text-brand-secondary hover:text-white transition-colors cursor-pointer"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">

          {/* Main Controls Section */}
          <div className="border border-brand-border rounded-2xl bg-brand-input/20 p-5 flex flex-col items-center justify-center text-center space-y-4">
            
            {/* Action State Visuals */}
            {isRecording ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="relative flex items-center justify-center w-16 h-16 bg-red-500/20 text-red-500 rounded-full animate-pulse border border-red-500/40">
                  <Mic className="w-8 h-8" />
                  <span className="absolute -inset-2 bg-red-500/10 rounded-full animate-ping opacity-75" />
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                  Gravando... {formatSeconds(recordingSeconds)}
                </span>
                <span className="text-xs text-brand-secondary">
                  Fale os dados da retirada pausadamente
                </span>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center space-y-2 py-4">
                <Loader2 className="w-12 h-12 text-brand-accent animate-spin" />
                <span className="text-sm font-bold text-white">Processando Áudio com IA...</span>
                <span className="text-xs text-brand-secondary">Extraindo dados estruturados do equipamento</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 w-full">
                
                {/* Audio Option Buttons */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  
                  {/* Record Button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex flex-col items-center justify-center bg-brand-input hover:bg-brand-input/80 border border-brand-border hover:border-brand-accent/50 rounded-xl p-4 text-center cursor-pointer transition-all group"
                  >
                    <Mic className="w-7 h-7 text-brand-accent group-hover:scale-110 transition-transform mb-2" />
                    <span className="text-xs font-semibold text-white">Gravar Voz</span>
                    <span className="text-[9px] text-brand-secondary mt-1">Grave pelo microfone</span>
                  </button>

                  {/* File Upload Button */}
                  <label className="flex flex-col items-center justify-center bg-brand-input hover:bg-brand-input/80 border border-brand-border hover:border-brand-accent/50 rounded-xl p-4 text-center cursor-pointer transition-all group">
                    <Upload className="w-7 h-7 text-brand-accent group-hover:scale-110 transition-transform mb-2" />
                    <span className="text-xs font-semibold text-white">Subir Áudio</span>
                    <span className="text-[9px] text-brand-secondary mt-1">Carregue um arquivo</span>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={handleFileUpload}
                      className="hidden" 
                    />
                  </label>

                </div>

              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 w-full text-left flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Record / File Details */}
            {(audioUrl || uploadedFile || transcriptText) && !isRecording && !isProcessing && (
              <div className="w-full bg-brand-input border border-brand-border rounded-xl p-3.5 text-left space-y-3.5">
                
                <div className="flex items-center justify-between border-b border-brand-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold text-white">
                      {uploadedFile ? uploadedFile.name : 'Áudio Gravado'}
                    </span>
                  </div>
                  <button
                    onClick={clearAudio}
                    className="p-1 hover:bg-red-500/10 text-brand-secondary hover:text-red-400 rounded transition-colors cursor-pointer"
                    title="Remover Áudio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {audioUrl && (
                  <audio src={audioUrl} controls className="w-full h-8 outline-none [color-scheme:dark]" />
                )}

                {/* Real-time speech transcription input area */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-brand-secondary uppercase tracking-wider">
                    Transcrição Textual (editável)
                  </label>
                  <textarea
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    placeholder="Transcrição da sua voz ou digite o texto aqui para a IA preencher..."
                    rows={3}
                    className="w-full text-xs rounded-lg bg-brand-bg border border-brand-border text-white p-2.5 outline-none focus:ring-1 focus:ring-brand-accent resize-none"
                  />
                </div>

                {/* Process Button */}
                <button
                  type="button"
                  onClick={processAudio}
                  className="w-full bg-brand-accent text-brand-bg font-bold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{apiKey ? 'Processar e Preencher com IA' : 'Processar com Regras Locais'}</span>
                </button>

              </div>
            )}

            {/* In recording state stop button */}
            {isRecording && (
              <button
                type="button"
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                <span>Parar Gravação</span>
              </button>
            )}

          </div>

          {/* Results Preview (If extraction succeeded) */}
          {extractedResult && !isRecording && !isProcessing && (
            <div className="bg-brand-input/40 border border-brand-border rounded-xl p-4 space-y-3">
              
              <div className="flex items-center gap-2 border-b border-brand-border/40 pb-2">
                <Info className="w-4 h-4 text-brand-accent" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Dados Extraídos Pela IA</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-brand-secondary block">Cliente:</span>
                  <span className="font-semibold text-white">{extractedResult.client || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-brand-secondary block">Motivo:</span>
                  <span className="font-semibold text-white">{extractedResult.type || 'Não informado'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-brand-secondary block">Equipamentos:</span>
                  <div className="mt-1 space-y-1">
                    {extractedResult.materials && Object.entries(extractedResult.materials).some(([_, count]) => (count || 0) > 0) ? (
                      Object.entries(extractedResult.materials).map(([key, count]) => {
                        if (!count) return null;
                        const sns = extractedResult.serials?.[key] || [];
                        const macs = extractedResult.macs?.[key] || [];
                        return (
                          <div key={key} className="bg-brand-bg/50 px-2 py-1 rounded border border-brand-border/30">
                            <span className="font-semibold text-brand-accent">{count}x {key}</span>
                            {sns.length > 0 && <span className="block text-[10px] text-brand-secondary">S/N: {sns.join(', ')}</span>}
                            {macs.length > 0 && <span className="block text-[10px] text-brand-secondary">MAC: {macs.join(', ')}</span>}
                          </div>
                        );
                      })
                    ) : (
                      <span className="italic text-brand-secondary text-[11px]">Nenhum equipamento detectado</span>
                    )}
                  </div>
                </div>
                {extractedResult.notes && (
                  <div className="col-span-2">
                    <span className="text-brand-secondary block">Observações:</span>
                    <p className="italic text-[#d1e5eb] mt-0.5">"{extractedResult.notes}"</p>
                  </div>
                )}
              </div>

              {/* Confirm / Apply buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExtractedResult(null)}
                  className="flex-1 border border-brand-border hover:bg-brand-input text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  Recusar / Tentar Novamente
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 bg-brand-accent text-brand-bg text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar e Preencher</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
