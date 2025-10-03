import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { InteractiveImageComponent } from './InteractiveImageNodeView';

export const InteractiveImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(InteractiveImageComponent);
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: 'auto' },
      height: { default: 'auto' },
      imageId: { default: null }, // <-- обязательно
    };
  },
});
