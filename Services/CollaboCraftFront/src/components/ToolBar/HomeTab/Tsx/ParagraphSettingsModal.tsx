import React, { useState } from 'react';

interface Props {
  initialValues: any;
  onClose: () => void;
  onSave: (settings: any) => void;
}


const PX_TO_CM = 0.026458;

const ParagraphSettingsModal: React.FC<Props> = ({ initialValues, onClose, onSave }) => {
  const [values, setValues] = useState({
    indentLeft: initialValues.indentLeft || 0,
    indentRight: initialValues.indentRight || 0,
    indentFirstLine: initialValues.indentFirstLine || 0,
    spacingBefore: initialValues.spacingBefore || 0,
    spacingAfter: initialValues.spacingAfter || 0,
    lineHeight: initialValues.lineHeight || 1.5,
  });

  // локальное состояние строк для инпутов (чтобы можно было очищать)
  const [inputs, setInputs] = useState({
    indentLeft: (values.indentLeft * PX_TO_CM).toFixed(1),
    indentRight: (values.indentRight * PX_TO_CM).toFixed(1),
    indentFirstLine: (values.indentFirstLine * PX_TO_CM).toFixed(1),
    spacingBefore: (values.spacingBefore * PX_TO_CM).toFixed(1),
    spacingAfter: (values.spacingAfter * PX_TO_CM).toFixed(1),
    lineHeight: values.lineHeight.toString(),
  });

  const handleChange = (key: keyof typeof inputs, val: string) => {
    setInputs({ ...inputs, [key]: val });
  };

  const handleBlur = (key: keyof typeof inputs) => {
    const raw = inputs[key];
    if (raw === '') return; // оставляем пустым, пока не введут число

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      if (key === 'lineHeight') {
        setValues({ ...values, lineHeight: parsed });
      } else {
        setValues({ ...values, [key]: parsed / PX_TO_CM });
      }
      setInputs({ ...inputs, [key]: parsed.toFixed(1) });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">Параметры абзаца</h2>

        {/* Отступы */}
        <h3 className="font-medium mb-2">Отступы</h3>
        <div className="space-y-3 mb-4">
          {(['indentLeft', 'indentRight', 'indentFirstLine'] as const).map((key) => (
            <label key={key} className="flex justify-between items-center">
              {key === 'indentLeft'
                ? 'Слева:'
                : key === 'indentRight'
                ? 'Справа:'
                : 'Первая строка:'}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={inputs[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  onBlur={() => handleBlur(key)}
                  className="border p-1 w-20 text-right"
                />
                <span className="text-gray-500">см</span>
              </div>
            </label>
          ))}
        </div>

        {/* Интервалы */}
        <h3 className="font-medium mb-2">Интервалы</h3>
        <div className="space-y-3">
          {(['spacingBefore', 'spacingAfter'] as const).map((key) => (
            <label key={key} className="flex justify-between items-center">
              {key === 'spacingBefore' ? 'Перед:' : 'После:'}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={inputs[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  onBlur={() => handleBlur(key)}
                  className="border p-1 w-20 text-right"
                />
                <span className="text-gray-500">см</span>
              </div>
            </label>
          ))}
          <label className="flex justify-between items-center">
            Межстрочный:
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={inputs.lineHeight}
                onChange={(e) => handleChange('lineHeight', e.target.value)}
                onBlur={() => handleBlur('lineHeight')}
                className="border p-1 w-20 text-right"
              />
              <span className="text-gray-500">×</span>
            </div>
          </label>
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <button className="px-3 py-1 rounded bg-gray-200" onClick={onClose}>
            Отмена
          </button>
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white"
            onClick={() => {
              onSave(values);
              onClose();
            }}
          >
            ОК
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParagraphSettingsModal;
