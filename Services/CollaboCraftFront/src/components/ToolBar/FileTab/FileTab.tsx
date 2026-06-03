import React from 'react';
import { Editor } from '@tiptap/react';
import { Block } from '../../../models/block'
import {
  Document,
  Packer,
  Paragraph as DocxParagraph,
  TextRun as DocxTextRun,
  HeadingLevel,
  AlignmentType,
  ShadingType,
  BorderStyle,
  ImageRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  TableWidthUnit,
} from 'docx';
import { saveAs } from 'file-saver';
import { generateHTML } from '@tiptap/html';
import { commonExtensions } from '../../Editor/editorExtensions';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface FileTabProps {
  editor: Editor;
  blocks: Block[];
  setShowFileMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showFileMenu: boolean;
  documentTitle: string;
}

function normalizeColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  color = color.trim();
  if (color.startsWith('#')) color = color.slice(1);
  if (/^[0-9A-Fa-f]{6}$/.test(color)) return color.toUpperCase();
  console.warn(`Некорректный цвет: ${color}`);
  return undefined;
}

// 🔹 Конвертация любых картинок в PNG через <canvas>
async function forceToPng(src: string): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context не доступен');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject('Не удалось сконвертировать в PNG');
            const reader = new FileReader();
            reader.onloadend = () => {
              const ab = reader.result as ArrayBuffer;
              resolve(new Uint8Array(ab));
            };
            reader.readAsArrayBuffer(blob);
          },
          'image/png',
          1.0
        );
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

// 🔹 Универсальная загрузка картинки, но результат всегда PNG
async function fetchImageData(src: string | undefined): Promise<{ data: Uint8Array; mime: string; length: number } | null> {
  if (!src) return null;
  try {
    const pngData = await forceToPng(src);
    if (pngData && pngData.length > 0) {
      const preview = Array.from(pngData.slice(0, 12)).map(b => b.toString(16).padStart(2, "0")).join(" ");
      console.log("✅ Картинка приведена к PNG", {
        url: src,
        length: pngData.length,
        firstBytes: preview,
      });
      return { data: pngData, mime: 'image/png', length: pngData.length };
    }
  } catch (e) {
    console.warn('❌ Ошибка при конвертации в PNG:', e);
  }
  return null;
}

export const FileTab: React.FC<FileTabProps> = ({ editor, blocks, setShowFileMenu, showFileMenu, documentTitle }) => {
  const handleExport = async () => {
    if (!editor) return;

    const allContents = blocks.map((block: Block) => {
      try {
        const parsed = JSON.parse(block.text || '{}');
        return parsed?.type === 'doc' ? parsed : { type: 'doc', content: [] };
      } catch {
        return { type: 'doc', content: [] };
      }
    });

    const content = {
      type: 'doc',
      content: allContents.flatMap((b: any) => b.content || []),
    };
    console.log('Полный JSON содержимого:', JSON.stringify(content, null, 2));
    const paragraphs: any[] = [];

    const alignmentMap: Record<string, typeof AlignmentType[keyof typeof AlignmentType]> = {
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT,
      justify: AlignmentType.JUSTIFIED,
    };

    const headingMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };

    const processTextNode = (node: any) => {
      if (node.type === 'text') {
        return [new DocxTextRun({
          text: node.text,
          bold: node.marks?.some((m: any) => m.type === 'bold'),
          italics: node.marks?.some((m: any) => m.type === 'italic'),
          underline: node.marks?.some((m: any) => m.type === 'underline') ? {} : undefined,
          strike: node.marks?.some((m: any) => m.type === 'strike'),
          color: normalizeColor(node.marks?.find((m: any) => m.type === 'textStyle')?.attrs?.color),
          size: node.marks?.find((m: any) => m.type === 'fontSize')?.attrs?.fontSize 
                ? parseInt(node.marks.find((m: any) => m.type === 'fontSize').attrs.fontSize) * 2 
                : undefined,
          font: node.marks?.find((m: any) => m.type === 'fontFamily')?.attrs?.fontFamily || undefined,
          shading: node.marks?.some((m: any) => m.type === 'highlight') ? {
            fill: normalizeColor(node.marks.find((m: any) => m.type === 'highlight').attrs?.color) || "FFFF00",
            type: ShadingType.SOLID
          } : undefined,
        })];
      }
      return [];
    };

    const processNode = async (node: any, target: any[] = paragraphs, listConfig: { type?: 'bullet' | 'ordered'; level?: number } = {}) => {
      if (node.type === 'image') {
        const img = await fetchImageData(node.attrs?.src);
        if (img) {
          target.push(new DocxParagraph({
            children: [new ImageRun({
              data: new Uint8Array(img.data),
              transformation: {
                width: Number(node.attrs?.width) || 300,
                height: Number(node.attrs?.height) || 200,
              },
            })],
          }));
        } else {
          target.push(new DocxParagraph({ children: [new DocxTextRun('⚠️ [Image not found]')] }));
        }
        return;
      }

      switch (node.type) {
        case 'table': {
          const rows: any[] = [];
          if (node.content) {
            for (const rowNode of node.content) {
              const cells: any[] = [];
              if (rowNode.content) {
                for (const cellNode of rowNode.content) {
                  const cellContent: any[] = [];
                  if (cellNode.content) {
                    for (const innerNode of cellNode.content) {
                      await processNode(innerNode, cellContent);
                    }
                  }
                  cells.push(new DocxTableCell({
                    children: cellContent.length > 0 ? cellContent : [new DocxParagraph("")],
                    shading: cellNode.type === 'tableHeader' ? { fill: "F2F2F2", type: ShadingType.SOLID } : undefined,
                  }));
                }
              }
              rows.push(new DocxTableRow({ children: cells }));
            }
          }
          target.push(new DocxTable({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }));
          break;
        }
        case 'bulletList': {
          if (node.content) for (const child of node.content) await processNode(child, target, { type: 'bullet', level: (listConfig.level ?? -1) + 1 });
          break;
        }
        case 'orderedList': {
          if (node.content) for (const child of node.content) await processNode(child, target, { type: 'ordered', level: (listConfig.level ?? -1) + 1 });
          break;
        }
        case 'listItem': {
          if (node.content) {
            for (const child of node.content) {
              await processNode(child, target, listConfig);
            }
          }
          break;
        }
        case 'paragraph': {
          const runs: any[] = [];
          
          // Добавляем маркер списка если нужно
          if (listConfig.type) {
            const indent = "  ".repeat(listConfig.level || 0);
            const marker = listConfig.type === 'bullet' ? "• " : "1. "; // Упрощенно
            runs.push(new DocxTextRun({ text: indent + marker, bold: true }));
          }

          if (node.content) {
            for (const child of node.content) {
              if (child.type === 'image') {
                const img = await fetchImageData(child.attrs?.src);
                if (img) {
                  runs.push(new ImageRun({
                    data: new Uint8Array(img.data),
                    transformation: {
                      width: Number(child.attrs?.width) || 300,
                      height: Number(child.attrs?.height) || 200,
                    },
                  }));
                } else {
                  runs.push(new DocxTextRun('⚠️ [Image not found]'));
                }
              } else {
                runs.push(...processTextNode(child));
              }
            }
          }
          target.push(new DocxParagraph({
            children: runs,
            alignment: node.attrs?.textAlign ? alignmentMap[node.attrs.textAlign] || AlignmentType.LEFT : AlignmentType.LEFT,
          }));
          break;
        }
        case 'heading': {
          const runs: any[] = [];
          if (node.content) {
            for (const child of node.content) {
              if (child.type === 'image') {
                const img = await fetchImageData(child.attrs?.src);
                if (img) {
                  runs.push(new ImageRun({
                    data: new Uint8Array(img.data),
                    transformation: { width: Number(child.attrs?.width) || 300, height: Number(child.attrs?.height) || 200 },
                  }));
                } else {
                  runs.push(new DocxTextRun('⚠️ [Image not found]'));
                }
              } else {
                runs.push(...processTextNode(child));
              }
            }
          }
          target.push(new DocxParagraph({ children: runs, heading: headingMap[node.attrs?.level] || HeadingLevel.HEADING_1 }));
          break;
        }
        case 'horizontalRule': {
          target.push(new DocxParagraph({
            children: [],
            border: { bottom: { color: '000000', style: BorderStyle.SINGLE, size: 4 } },
            spacing: { before: 120, after: 120 },
          }));
          break;
        }
        default:
          console.warn(`Необработанный тип узла: ${node.type}`);
          if (node.content) for (const child of node.content) await processNode(child, target, listConfig);
          break;
      }
    };

    for (const node of content.content) {
      await processNode(node);
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    try {
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${documentTitle || 'document'}.docx`);
    } catch (e) {
      console.error('Ошибка при упаковке/скачивании docx:', e);
      alert('Ошибка при создании .docx. Смотрите консоль для деталей.');
    }

    setShowFileMenu(false);
  };

  const handleExportPdf = async () => {
    if (!editor) return;

    const allContents = blocks.map((block: Block) => {
      try {
        const parsed = JSON.parse(block.text || '{}');
        return parsed?.type === 'doc' ? parsed : { type: 'doc', content: [] };
      } catch {
        return { type: 'doc', content: [] };
      }
    });

    const content = {
      type: 'doc',
      content: allContents.flatMap((b: any) => b.content || []),
    };

    const htmlContent = generateHTML(content, commonExtensions);

    // Создаем временный контейнер для рендеринга
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.padding = '40px';
    container.style.width = '794px'; // Приблизительная ширина A4
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.className = 'prose prose-sm max-w-none';

    // Добавляем стили для таблиц и изображений
    const style = document.createElement('style');
    style.innerHTML = `
      table { border-collapse: collapse; width: 100%; margin-bottom: 1em; table-layout: fixed; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; word-break: break-word; overflow-wrap: anywhere; }
      th { background-color: #f2f2f2; }
      img { max-width: 100%; height: auto; display: block; margin: 10px 0; }
      .prose { font-family: sans-serif; line-height: 1.6; }
      p { margin-bottom: 1em; }
    `;
    container.appendChild(style);
    document.body.appendChild(container);

    const options = {
      margin: 10,
      filename: `${documentTitle || 'document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as const;

    try {
      await html2pdf().set(options).from(container).save();
    } catch (e) {
      console.error('Ошибка при экспорте в PDF:', e);
      alert('Ошибка при создании PDF.');
    } finally {
      document.body.removeChild(container);
    }

    setShowFileMenu(false);
  };

  return (
    <div>
      <button
        type="button"
        className="bg-gray-100 px-4 py-2 rounded shadow hover:bg-gray-200"
        onClick={() => setShowFileMenu((prev) => !prev)}
      >
        📁 Меню файла
      </button>
      {showFileMenu && (
        <div className="absolute mt-2 bg-white border rounded shadow z-50 w-56">
          <button
            type="button"
            onClick={handleExport}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
          >
            <span>📄</span> Экспортировать в Word
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
          >
            <span>📕</span> Экспортировать в PDF
          </button>
        </div>
      )}
    </div>
  );
};
