import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Calendar, 
  User, 
  FileText, 
  Plus, 
  Minus, 
  Camera, 
  Loader2 
} from 'lucide-react';
import { MaterialsCount, Withdrawal } from '../types';
import { getCurrentCoordinates, reverseGeocode } from '../utils/geolocation';

interface WithdrawalFormProps {
  initialTechnician: string;
  techniciansList: string[];
  onSubmit: (data: Omit<Withdrawal, 'createdAt' | 'createdBy' | 'status'>) => Promise<void>;
}

const DEFAULT_MATERIALS: MaterialsCount = {
  "Roteador GIGA": 0,
  "Roteador FAST": 0,
  ONU: 0,
  ONT: 0,
  Conectores: 0
};

const BASE_TYPES = [
  'Retirada - Inadimplência',
  'Retirada - Insatisfação',
  'Retirada - Mudança de cidade',
  'Retirada - Não renovado',
  'Retirada - Sem viabilidade',
  'Retirada - Troca de provedor',
  'Retirada - Óbito',
  'Retirada - Drop',
  'Retirada - Cancelado',
  'Retirada - Troca de endereço',
  'Retirada - Troca de local c conexão',
  'Retirada - Pedido de cancelamento'
];

export const WithdrawalForm: React.FC<WithdrawalFormProps> = ({
  initialTechnician,
  techniciansList,
  onSubmit
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Form Fields
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [technician, setTechnician] = useState(initialTechnician);
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('Retirada - Inadimplência');
  const [newType, setNewType] = useState('');
  const [notes, setNotes] = useState('');

  // Materials & Serials
  const [materials, setMaterials] = useState<MaterialsCount>(DEFAULT_MATERIALS);
  const [serials, setSerials] = useState<Record<string, string[]>>({});
  
  // Custom Types list
  const [customTypes, setCustomTypes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('newLifeCustomTypes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const allTypes = [...BASE_TYPES, ...customTypes, 'Outro (Adicionar Novo)'];

  // Photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Sync initial technician display name
  useEffect(() => {
    if (initialTechnician) {
      setTechnician(initialTechnician);
    }
  }, [initialTechnician]);

  // Adjust serials array size based on materials count change
  const adjustSerialsCount = (key: keyof MaterialsCount, count: number) => {
    setSerials((prev) => {
      const prevList = prev[key] || [];
      let newList = [...prevList];
      if (count > prevList.length) {
        while (newList.length < count) {
          newList.push('');
        }
      } else if (count < prevList.length) {
        newList = newList.slice(0, count);
      }
      return { ...prev, [key]: newList };
    });
  };

  const handleMaterialChange = (key: keyof MaterialsCount, delta: number) => {
    setMaterials((prev) => {
      const current = prev[key];
      const newVal = Math.max(0, current + delta);
      adjustSerialsCount(key, newVal);
      return { ...prev, [key]: newVal };
    });
  };

  const handleSerialChange = (key: keyof MaterialsCount, index: number, val: string) => {
    setSerials((prev) => {
      const newList = [...(prev[key] || [])];
      newList[index] = val;
      return { ...prev, [key]: newList };
    });
  };

  // Photo Watermarking & Geo Capturing
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingGeo(true);
    // 1. Get GPS coordinates
    getCurrentCoordinates()
      .then(async (coords) => {
        // 2. reverse geocode to address
        const resolvedAddress = await reverseGeocode(coords.latitude, coords.longitude);
        if (resolvedAddress && !address) {
          setAddress(resolvedAddress);
        }
        processPhoto(file, coords, resolvedAddress);
      })
      .catch((err) => {
        console.warn('Geolocalização não autorizada ou falhou', err);
        processPhoto(file, null, '');
      })
      .finally(() => {
        setLoadingGeo(false);
      });
  };

  const processPhoto = (
    file: File, 
    coords: { latitude: number; longitude: number } | null, 
    resolvedAddr: string
  ) => {
    const reader = new FileReader();
    reader.onload = (eEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = img.width;
        let height = img.height;
        
        // Scale down to max 800px width
        if (width > 800) {
          height = Math.round((800 / width) * height);
          width = 800;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Watermark gradient banner
        const gradient = ctx.createLinearGradient(0, height - 120, 0, height);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 120, width, 120);

        // Watermark Texts
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        const timestamp = new Date().toLocaleString('pt-BR');
        const gpsStr = coords 
          ? `GPS: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` 
          : 'GPS: Não disponível';
        const addrText = resolvedAddr || address || 'Não informado';

        ctx.fillText(`Data: ${timestamp}`, 15, height - 85);
        ctx.fillText(`Técnico: ${technician || 'Não informado'}`, 15, height - 60);
        ctx.fillText(`Endereço: ${addrText}`, 15, height - 35);
        ctx.fillText(gpsStr, 15, height - 10);

        setPhotoUrl(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = eEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Check if at least one material has count > 0
    const hasMaterials = Object.values(materials).some((c) => c > 0);
    if (!hasMaterials) {
      alert('Selecione pelo menos um equipamento recolhido.');
      return;
    }

    // Validate fields char limit
    if (technician.length > 100) return alert('O nome do técnico excede o limite de 100 caracteres.');
    if (client.length > 150) return alert('O nome do cliente excede o limite de 150 caracteres.');
    if (address.length > 250) return alert('O endereço excede o limite de 250 caracteres.');
    if (notes.length > 500) return alert('As observações excedem o limite de 500 caracteres.');

    // Resolve Type
    let resolvedType = type;
    if (type === 'Outro (Adicionar Novo)') {
      const sanitized = newType.replace(/[<>"'&]/g, '').trim();
      const finalType = sanitized.slice(0, 100);
      if (!finalType) {
        alert('Digite o nome do novo tipo.');
        return;
      }
      resolvedType = finalType;
      
      // Save custom types to local storage
      if (!customTypes.includes(finalType) && !BASE_TYPES.includes(finalType)) {
        const updated = [...customTypes, finalType].slice(0, 50); // limit to 50 items
        setCustomTypes(updated);
        localStorage.setItem('newLifeCustomTypes', JSON.stringify(updated));
      }
    }

    setSubmitting(true);
    try {
      // Filter out materials with 0 count
      const activeMaterials: Partial<MaterialsCount> = {};
      const activeSerials: Record<string, string[]> = {};

      Object.entries(materials).forEach(([key, count]) => {
        if (count > 0) {
          activeMaterials[key as keyof MaterialsCount] = count;
          
          const serialsList = serials[key] || [];
          const sanitized = serialsList.map((sn) => sn.replace(/[<>"'&]/g, '').trim());
          if (sanitized.some(Boolean)) {
            activeSerials[key] = sanitized;
          }
        }
      });

      await onSubmit({
        date,
        technician: technician.trim(),
        client: client.trim(),
        address: address.trim(),
        type: resolvedType,
        materials: activeMaterials,
        serials: activeSerials,
        photoUrl,
        notes: notes.trim()
      });

      // Reset form
      setClient('');
      setAddress('');
      setType('Retirada - Inadimplência');
      setNewType('');
      setNotes('');
      setMaterials(DEFAULT_MATERIALS);
      setSerials({});
      setPhotoUrl(null);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-brand-card rounded-xl shadow-lg border border-brand-border overflow-hidden sticky top-24">
      <div className="bg-[#07303d] border-b border-brand-border px-5 py-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-brand-accent" />
        <h2 className="font-semibold text-white">Registrar Recolhimento</h2>
      </div>

      <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
        
        {/* Date Input */}
        <div>
          <label className="block text-sm font-medium text-brand-secondary mb-1">Data</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="w-4 h-4 text-brand-secondary" />
            </div>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="pl-10 w-full rounded-lg bg-brand-input border border-brand-border text-white px-3 py-2 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Technician Input */}
        <div>
          <label className="block text-sm font-medium text-brand-secondary mb-1">Equipe / Técnico</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="w-4 h-4 text-brand-secondary" />
            </div>
            <input 
              type="text" 
              list="technicians-list"
              placeholder="Ex: João e Maria"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              required
              maxLength={100}
              className="pl-10 w-full rounded-lg bg-brand-input border border-brand-border text-white placeholder-[#456b78] px-3 py-2 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all"
            />
            <datalist id="technicians-list">
              {techniciansList.map((tech) => (
                <option key={tech} value={tech} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Client Input */}
        <div>
          <label className="block text-sm font-medium text-brand-secondary mb-1">Nome do Cliente</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="w-4 h-4 text-brand-secondary" />
            </div>
            <input 
              type="text" 
              placeholder="Nome do cliente"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              required
              maxLength={150}
              className="pl-10 w-full rounded-lg bg-brand-input border border-brand-border text-white placeholder-[#456b78] px-3 py-2 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all"
            />
          </div>
        </div>

        {/* Address Input */}
        <div>
          <label className="block text-sm font-medium text-brand-secondary mb-1">Endereço</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="w-4 h-4 text-brand-secondary" />
            </div>
            <input 
              type="text" 
              placeholder="Rua, N°, Bairro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              maxLength={250}
              className="pl-10 w-full rounded-lg bg-brand-input border border-brand-border text-white placeholder-[#456b78] px-3 py-2 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all"
            />
          </div>
        </div>

        {/* Type Select */}
        <div>
          <label className="block text-sm font-medium text-brand-secondary mb-1">Tipo de Retirada</label>
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg bg-brand-input border border-brand-border text-white px-3 py-2 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all appearance-none"
          >
            {allTypes.map((item) => (
              <option key={item} value={item} className="bg-brand-input">{item}</option>
            ))}
          </select>
        </div>

        {/* Custom Type Text Input */}
        {type === 'Outro (Adicionar Novo)' && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-medium text-brand-accent mb-1">Nome do Novo Tipo</label>
            <input 
              type="text" 
              placeholder="Ex: Retirada - Furto..."
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              required
              maxLength={100}
              className="w-full rounded-lg bg-[#07303d] border-brand-accent/50 border text-white placeholder-[#456b78] px-3 py-2 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all shadow-md"
            />
          </div>
        )}

        {/* Materials quantities */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-brand-accent mb-3 border-b border-brand-border pb-2">
            Indique as quantidades:
          </label>
          <div className="space-y-3">
            {(Object.keys(materials) as Array<keyof MaterialsCount>).map((key) => {
              const count = materials[key];
              const isSelected = count > 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-brand-border bg-brand-input/30">
                    <span className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-brand-secondary'}`}>
                      {key}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleMaterialChange(key, -1)}
                        className="w-8 h-8 rounded-lg bg-brand-input flex items-center justify-center text-brand-secondary hover:text-white border border-brand-border hover:border-brand-border-hover transition-colors cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-white">{count}</span>
                      <button
                        type="button"
                        onClick={() => handleMaterialChange(key, 1)}
                        className="w-8 h-8 rounded-lg bg-brand-input flex items-center justify-center text-brand-secondary hover:text-white border border-brand-border hover:border-brand-border-hover transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Serial input rendering (only if count > 0 and not Conectores) */}
                  {isSelected && key !== 'Conectores' && (
                    <div className="pl-4 border-l-2 border-[#125366] space-y-2 animate-in fade-in duration-300">
                      <p className="text-[11px] text-brand-accent font-semibold tracking-wider uppercase">
                        S/N (Números de Série)
                      </p>
                      {Array.from({ length: count }).map((_, index) => (
                        <input
                          key={`${key}-sn-${index}`}
                          type="text"
                          placeholder={`Número de Série ${index + 1}`}
                          value={(serials[key] && serials[key][index]) || ''}
                          onChange={(e) => handleSerialChange(key, index, e.target.value)}
                          maxLength={100}
                          className="w-full text-xs rounded-lg bg-brand-input border border-brand-border text-white placeholder-[#456b78] px-3 py-1.5 focus:ring-1 focus:ring-brand-accent outline-none"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes input */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-brand-secondary mb-1">Observações</label>
          <textarea
            placeholder="Observações adicionais..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-lg bg-brand-input border border-brand-border text-white placeholder-[#456b78] px-3 py-2 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all resize-none"
          />
        </div>

        {/* Photo watermark loader & camera input */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-brand-secondary mb-2">Comprovante de Foto (Obrigatório)</label>
          <div className="flex flex-col items-center gap-3">
            <label className="w-full flex flex-col items-center justify-center bg-brand-input border border-brand-border border-dashed hover:border-brand-border-hover rounded-xl p-4 cursor-pointer hover:bg-brand-card/40 transition-all text-center">
              {loadingGeo ? (
                <>
                  <Loader2 className="w-8 h-8 text-brand-accent animate-spin mb-2" />
                  <span className="text-xs text-brand-accent">Buscando coordenadas GPS...</span>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-brand-secondary mb-2" />
                  <span className="text-xs text-white font-medium">Tirar Foto ou Fazer Upload</span>
                  <span className="text-[10px] text-brand-secondary mt-1">
                    Geolocalização e data serão carimbadas na foto
                  </span>
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handlePhotoCapture}
                disabled={loadingGeo || submitting}
                className="hidden" 
              />
            </label>

            {photoUrl && (
              <div className="relative w-full rounded-xl overflow-hidden border border-brand-border">
                <img src={photoUrl} alt="Comprovante" className="w-full h-auto object-cover max-h-48" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow-lg cursor-pointer"
                  title="Remover Foto"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || loadingGeo || !photoUrl}
          className="w-full flex items-center justify-center gap-2 bg-[#0bd6a8] hover:bg-[#09c096] text-[#04242e] font-bold py-3 px-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer mt-6"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar Recolhimento</span>
          )}
        </button>

      </form>
    </div>
  );
};
