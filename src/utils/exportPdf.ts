import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Withdrawal, GeneralStats } from '../types';
import { formatDateBR } from './exportCsv';

export function exportToPDF(withdrawals: Withdrawal[], stats: GeneralStats): void {
  try {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString('pt-BR');

    // 1. Header background banner
    doc.setFillColor(4, 36, 46); // Color: #04242e
    doc.rect(0, 0, 210, 30, 'F');

    // 2. Header text: new life
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(22);
    doc.text('new life', 14, 18);

    // Subtitle: a sua nova internet
    doc.setTextColor(142, 176, 186); // Color: #8eb0ba
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('a sua nova internet', 14, 24);

    // Extraction metadata
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Relatório de Retiradas', 150, 18);
    doc.setFontSize(8);
    doc.text(`Extração: ${todayStr}`, 150, 24);

    // 3. Inventory balance section
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Balanço de Inventário', 14, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Roteadores Recuperados: ${stats.roteadores}`, 14, 55);
    doc.text(`Total de ONUs: ${stats.onu}`, 14, 62);
    doc.text(`Total de ONTs: ${stats.ont}`, 14, 69);
    doc.text(`Conectores Recolhidos: ${stats.conectores}`, 14, 76);

    // 4. Detailed history section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Histórico Detalhado', 14, 95);

    // 5. Build table body
    const tableBody = withdrawals.map((w) => {
      let materialsStr = 'Nenhum';
      if (w.materials) {
        materialsStr = Object.entries(w.materials)
          .map(([key, count]) => {
            const serialsList = w.serials && w.serials[key]
              ? w.serials[key].filter(Boolean)
              : [];
            return `${count}x ${key}${
              serialsList.length > 0 ? `\n(S/N: ${serialsList.join(', ')})` : ''
            }`;
          })
          .join('\n');
      }

      const clientInfo = `${w.client}\nEnd: ${w.address}`;
      const typeInfo = `${w.type}\nStatus: ${w.status || 'Pendente'}`;

      return [
        formatDateBR(w.date),
        clientInfo,
        w.technician || '',
        materialsStr,
        typeInfo
      ];
    });

    // 6. Generate autoTable
    autoTable(doc, {
      startY: 100,
      head: [['Data', 'Cliente / Endereço', 'Técnico', 'Materiais & Números de Série', 'Tipo de Retirada / Status']],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [10, 56, 69], // Color: #0a3845
        textColor: 255,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      columnStyles: {
        1: { cellWidth: 45 },
        3: { cellWidth: 55 },
        4: { cellWidth: 40 },
      },
    });

    // 7. Save file
    const fileSuffix = todayStr.replace(/\//g, '-');
    doc.save(`Retiradas_NewLife_${fileSuffix}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('Não foi possível gerar o PDF. Tente novamente.');
  }
}
