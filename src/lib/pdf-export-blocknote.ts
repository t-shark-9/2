import jsPDF from 'jspdf';

interface BlockNoteBlock {
  type: string;
  content?: Array<{ type: string; text?: string; styles?: any }>;
  props?: any;
  children?: BlockNoteBlock[];
}

interface PDFExportOptions {
  title: string;
  blocks: BlockNoteBlock[];
  subject?: string;
  author?: string;
}

export async function exportBlockNoteToPDF(options: PDFExportOptions): Promise<void> {
  const { title, blocks, subject, author = "IBDP Student" } = options;

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    
    let yPosition = margin;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Add header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100);
    
    if (subject) {
      pdf.text(`Subject: ${subject}`, margin, yPosition);
      yPosition += 6;
    }
    
    if (author) {
      pdf.text(`Author: ${author}`, margin, yPosition);
      yPosition += 6;
    }
    
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 6;

    // Calculate word count
    const wordCount = calculateWordCount(blocks);
    pdf.text(`Word Count: ${wordCount}`, margin, yPosition);
    yPosition += 15;

    // Add separator line
    pdf.setDrawColor(200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    pdf.setTextColor(0);

    // Process blocks
    for (const block of blocks) {
      const processedHeight = await processBlock(pdf, block, margin, yPosition, maxWidth, checkPageBreak);
      yPosition = processedHeight;
    }

    // Save the PDF
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_draft.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

async function processBlock(
  pdf: jsPDF,
  block: BlockNoteBlock,
  x: number,
  y: number,
  maxWidth: number,
  checkPageBreak: (space: number) => void
): Promise<number> {
  let currentY = y;

  // Extract text from block
  const text = extractTextFromBlock(block);
  
  if (!text && block.type !== 'image') {
    return currentY + 5; // Empty block, add small space
  }

  // Handle different block types
  switch (block.type) {
    case 'heading':
      const level = block.props?.level || 1;
      const headingSize = level === 1 ? 16 : level === 2 ? 14 : 12;
      pdf.setFontSize(headingSize);
      pdf.setFont('helvetica', 'bold');
      checkPageBreak(10);
      const headingLines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(headingLines, x, currentY);
      currentY += headingLines.length * (headingSize * 0.5) + 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      break;

    case 'bulletListItem':
      checkPageBreak(8);
      pdf.setFontSize(11);
      pdf.text('•', x, currentY);
      const bulletLines = pdf.splitTextToSize(text, maxWidth - 10);
      pdf.text(bulletLines, x + 5, currentY);
      currentY += bulletLines.length * 6 + 3;
      break;

    case 'numberedListItem':
      checkPageBreak(8);
      pdf.setFontSize(11);
      // Note: In a real implementation, you'd track the number
      pdf.text('1.', x, currentY);
      const numberLines = pdf.splitTextToSize(text, maxWidth - 10);
      pdf.text(numberLines, x + 7, currentY);
      currentY += numberLines.length * 6 + 3;
      break;

    case 'image':
      checkPageBreak(60);
      if (block.props?.url) {
        try {
          // Handle base64 images
          const imgData = block.props.url;
          const imgWidth = Math.min(maxWidth, 160);
          const imgHeight = 100; // Default height, could be calculated from aspect ratio
          
          pdf.addImage(imgData, 'PNG', x, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 10;
          
          // Add caption if exists
          if (block.props.caption) {
            pdf.setFontSize(9);
            pdf.setTextColor(100);
            const captionLines = pdf.splitTextToSize(block.props.caption, maxWidth);
            pdf.text(captionLines, x, currentY);
            currentY += captionLines.length * 4 + 5;
            pdf.setTextColor(0);
            pdf.setFontSize(11);
          }
        } catch (error) {
          console.error('Error adding image to PDF:', error);
          pdf.setFontSize(9);
          pdf.setTextColor(150);
          pdf.text('[Image could not be rendered]', x, currentY);
          currentY += 10;
          pdf.setTextColor(0);
          pdf.setFontSize(11);
        }
      }
      break;

    default: // paragraph and other blocks
      checkPageBreak(8);
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, currentY);
      currentY += lines.length * 6 + 5;
      break;
  }

  return currentY;
}

function extractTextFromBlock(block: BlockNoteBlock): string {
  if (!block.content) return '';
  
  return block.content
    .map(item => {
      if (item.type === 'text' && item.text) {
        return item.text;
      }
      return '';
    })
    .join('');
}

function calculateWordCount(blocks: BlockNoteBlock[]): number {
  let count = 0;
  
  const countInBlock = (block: BlockNoteBlock) => {
    const text = extractTextFromBlock(block);
    if (text) {
      count += text.trim().split(/\s+/).filter(w => w.length > 0).length;
    }
    
    if (block.children) {
      block.children.forEach(countInBlock);
    }
  };
  
  blocks.forEach(countInBlock);
  return count;
}
