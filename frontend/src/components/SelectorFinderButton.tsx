import { Search } from 'lucide-react';
import { useSelectorFinder } from '../hooks/useSelectorFinder';
import SelectorListModal from './SelectorListModal';

interface SelectorFinderButtonProps {
  nodeId: string;
  fieldName: string;
}

export default function SelectorFinderButton({
  nodeId,
  fieldName,
}: SelectorFinderButtonProps) {
  const { startFinder, selectors, showModal, loading, handleAccept, handleCancel } =
    useSelectorFinder(nodeId, fieldName);

  return (
    <>
      <button
        type="button"
        onClick={startFinder}
        disabled={loading}
        className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Find selector in browser"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Search size={16} />
        )}
      </button>
      {showModal && (
        <SelectorListModal
          selectors={selectors}
          nodeId={nodeId}
          fieldName={fieldName}
          onAccept={handleAccept}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
