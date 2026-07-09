import { Withdrawal } from '../types';

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function exportToCSV(withdrawals: Withdrawal[]): void {
  try {
    const headers = [
      'Data',
      'Cliente',
      'Equipe/Técnico',
      'Endereço',
      'Tipo de Retirada',
      'Materiais',
      'Seriais',
      'Status',
      'Observações'
    ];

    const rows = withdrawals.map((w) => {
      let materialsStr = 'Nenhum';
      let serialsStr = '';

      if (w.materials) {
        materialsStr = Object.entries(w.materials)
          .map(([key, val]) => `${val}x ${key}`)
          .join(' | ');

        serialsStr = Object.entries(w.materials)
          .map(([key, _]) => {
            const serialsList = w.serials && w.serials[key] 
              ? w.serials[key].filter(Boolean) 
              : [];
            return serialsList.length > 0 
              ? `${key}: [${serialsList.join(', ')}]` 
              : '';
          })
          .filter(Boolean)
          .join(' | ');
      }

      return [
        formatDateBR(w.date),
        w.client || '',
        w.technician || '',
        w.address || '',
        w.type || '',
        materialsStr,
        serialsStr,
        w.status || 'Pendente',
        (w.notes || '').replace(/\n/g, ' ')
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) =>
        row.map((val) => `"${val.replace(/"/g, '""')}"`).join(';')
      )
    ].join('\n');

    // Create a Blob with UTF-8 BOM to make Excel read accents properly
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Planilha_Retiradas_NewLife_${todayStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar CSV:', error);
    alert('Não foi possível gerar a planilha CSV.');
  }
}
