import { sendBlockMessage } from '../api/signalr';

export const showImageMenu = (x: number, y: number, node: any, editor: any, getPos: () => number) => {
  const menu = document.createElement('div');
  menu.style.position = 'fixed';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.background = 'white';
  menu.style.border = '1px solid gray';
  menu.style.padding = '4px';
  menu.style.zIndex = '1000';

  const deleteBtn = document.createElement('button');
  deleteBtn.innerText = 'Удалить';
  deleteBtn.onclick = async () => {
    try {
      const imageId = node.attrs.imageId;
      console.log(imageId);
      await sendBlockMessage('DeleteBlockImage', [imageId]); // удаляем с сервера
      const pos = getPos();
      const tr = editor.state.tr.deleteRange(pos, pos + node.nodeSize);
      editor.view.dispatch(tr); // удаляем узел из документа
    } catch (error) {
      console.error('Ошибка удаления изображения:', error);
    } finally {
      if (menu.parentElement) document.body.removeChild(menu);
      document.removeEventListener('click', handleClickOutside);
    }
  };

  menu.appendChild(deleteBtn);
  document.body.appendChild(menu);

  const handleClickOutside = (e: MouseEvent) => {
    if (menu.parentElement && !menu.contains(e.target as Node)) {
      document.body.removeChild(menu);
      document.removeEventListener('click', handleClickOutside);
    }
  };

  document.addEventListener('click', handleClickOutside);
};
