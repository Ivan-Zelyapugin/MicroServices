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
} from 'docx';
import { saveAs } from 'file-saver';

interface FileTabProps {
  editor: Editor;
  blocks: Block[];
  setShowFileMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showFileMenu: boolean;
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

export const FileTab: React.FC<FileTabProps> = ({ editor, blocks, setShowFileMenu, showFileMenu }) => {
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
      const runs: any[] = [];
      if (node.type === 'text' && node.text) {
        const runOptions: any = { text: node.text };
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            if (mark.type === 'bold') runOptions.bold = true;
            if (mark.type === 'italic') runOptions.italics = true;
            if (mark.type === 'underline') runOptions.underline = {};
            if (mark.type === 'strike') runOptions.strike = true;
            if (mark.type === 'superscript') runOptions.superScript = true;
            if (mark.type === 'subscript') runOptions.subScript = true;
            if (mark.type === 'textStyle') {
              if (mark.attrs?.fontFamily) runOptions.font = { name: mark.attrs.fontFamily };
              if (mark.attrs?.fontSize) runOptions.size = parseInt(mark.attrs.fontSize) * 2;
              if (mark.attrs?.color) {
                const hexColor = normalizeColor(mark.attrs.color);
                if (hexColor) runOptions.color = hexColor;
              }
            }
            if (mark.type === 'highlight') {
              const rawColor = mark.attrs.color;
              const hexBgColor = normalizeColor(rawColor);
              if (hexBgColor) {
                runOptions.shading = { type: ShadingType.SOLID, fill: hexBgColor } as any;
              }
            }
          });
        }
        runs.push(new DocxTextRun(runOptions));
      }
      return runs;
    };

    const processNode = async (node: any, listConfig: { type?: 'bullet' | 'ordered'; level?: number } = {}) => {
      if (node.type === 'image') {
        const img = await fetchImageData(node.attrs?.src);
        if (img) {
  console.log("📥 Вставка ImageRun:", {
    mime: img.mime,
    length: img.length,
    firstBytes: Array.from(img.data.slice(0, 12)).map(b => b.toString(16).padStart(2, "0")).join(" "),
    width: Number(node.attrs?.width) || 300,
    height: Number(node.attrs?.height) || 200,
  });

  paragraphs.push(new DocxParagraph({
    children: [new ImageRun({
      data: new Uint8Array(img.data),
      transformation: {
        width: Number(node.attrs?.width) || 300,
        height: Number(node.attrs?.height) || 200,
      },
    }),
    new DocxTextRun(" "),
  ],
  }));
} else {
  paragraphs.push(new DocxParagraph({ children: [new DocxTextRun('⚠️ [Image not found]')] }));
}
        return;
      }

      switch (node.type) {
        case 'paragraph': {
          const runs: any[] = [];
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
          paragraphs.push(new DocxParagraph({
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
          paragraphs.push(new DocxParagraph({ children: runs, heading: headingMap[node.attrs?.level] || HeadingLevel.HEADING_1 }));
          break;
        }
        case 'bulletList': {
          if (node.content) for (const child of node.content) await processNode(child, { type: 'bullet', level: 0 });
          break;
        }
        case 'orderedList': {
          if (node.content) for (const child of node.content) await processNode(child, { type: 'ordered', level: 0 });
          break;
        }
        case 'listItem': {
          if (node.content) for (const child of node.content) await processNode(child, listConfig);
          break;
        }
        case 'horizontalRule': {
          paragraphs.push(new DocxParagraph({
            children: [],
            border: { bottom: { color: '000000', style: BorderStyle.SINGLE, size: 4 } },
            spacing: { before: 120, after: 120 },
          }));
          break;
        }
        default:
          console.warn(`Необработанный тип узла: ${node.type}`);
          if (node.content) for (const child of node.content) await processNode(child, listConfig);
          break;
      }
    };

    if (content.content) {
      for (const node of content.content) {
        await processNode(node);
      }
    }

    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    try {
      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'document.docx');
    } catch (e) {
      console.error('Ошибка при упаковке/скачивании docx:', e);
      alert('Ошибка при создании .docx. Смотрите консоль для деталей.');
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
        <div className="absolute mt-2 bg-white border rounded shadow z-50 w-48">
          <button
            type="button"
            onClick={handleExport}
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            📤 Экспортировать в Word
          </button>
        </div>
      )}
    </div>
  );
};
