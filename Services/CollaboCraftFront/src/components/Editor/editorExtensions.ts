// editorExtensions.ts
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextStyle from '@tiptap/extension-text-style';
import { FontFamily } from '../../extensions/FontFamily';
import { FontSize } from '../../extensions/FontSize';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
//import Image from '@tiptap/extension-image';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Heading from '@tiptap/extension-heading';
import { CustomParagraph } from '../../extensions/CustomParagraph'
import { InteractiveImage } from '../../extensions/InteractiveImage';

export const commonExtensions = [
  StarterKit.configure({ history: false, bulletList: false, orderedList: false, heading: false, paragraph: false }),
  TextStyle,
  FontFamily,
  FontSize,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph', 'listItem'] }),
  InteractiveImage,
  //Image,
  BulletList.configure({ HTMLAttributes: { class: 'list-disc pl-6' } }),
  OrderedList.configure({ HTMLAttributes: { class: 'list-decimal pl-6' } }),
  ListItem,
  Underline,
  CustomParagraph,
  Subscript,
  Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,

  Superscript,
  Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
];
