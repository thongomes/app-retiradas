export interface MaterialsCount {
  "Roteador GIGA": number;
  "Roteador FAST": number;
  ONU: number;
  ONT: number;
  Conectores: number;
}

export type MaterialKey = keyof MaterialsCount;

export interface Withdrawal {
  id?: string;
  date: string;
  technician: string;
  client: string;
  address?: string;
  type: string;
  notes: string;
  materials: Partial<MaterialsCount>;
  serials: Record<string, string[]>;
  macs?: Record<string, string[]>;
  photoUrl: string | null;
  status: 'Pendente' | 'Avariado' | 'Recebido';
  createdAt: number;
  createdBy: string;
}

export interface UserStats {
  name: string;
  count: number;
}

export interface TypeStats {
  name: string;
  count: number;
}

export interface GeneralStats {
  totalRetiradas: number;
  pendentesConferencia: number;
  avariados: number;
  recebidosOk: number;
  roteadores: number;
  onu: number;
  ont: number;
  conectores: number;
  topTechnicians: UserStats[];
  topTypes: TypeStats[];
}
