import { PropertyRenderer } from './types';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import { useSettingsStore } from '../../../store/settingsStore';

export const renderCommentBoxProperties: PropertyRenderer = ({ renderData, setShowMarkdownEditor }) => {
  const content = renderData.content || '';
  
  // Get text color based on theme
  const theme = useSettingsStore.getState().appearance.theme;
  const textColor = theme === 'light' ? '#1F2937' : '#e5e7eb';

  return (
    <div className="mt-2">
      <div
        onClick={() => setShowMarkdownEditor?.(true)}
        className="cursor-pointer min-h-[60px] p-2 rounded border border-gray-600 hover:border-gray-500 transition-colors"
        style={{ color: textColor }}
      >
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
};
