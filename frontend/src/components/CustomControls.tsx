import { Controls } from 'reactflow';
import { Eye, EyeOff } from 'lucide-react';

interface CustomControlsProps {
  edgesHidden: boolean;
  setEdgesHidden: (hidden: boolean) => void;
}

export default function CustomControls({ edgesHidden, setEdgesHidden }: CustomControlsProps) {
  const handleToggleEdges = () => {
    setEdgesHidden(!edgesHidden);
  };

  return (
    <div className="react-flow__controls" style={{ zIndex: 1000 }}>
      <button
        onClick={handleToggleEdges}
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-gray-800 border border-gray-700 rounded p-2 hover:bg-gray-700 transition-colors text-white mb-2"
        title={edgesHidden ? 'Show connections' : 'Hide connections'}
        style={{ cursor: 'pointer', pointerEvents: 'auto', position: 'relative', zIndex: 1001 }}
      >
        {edgesHidden ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <Controls className="bg-gray-800 border border-gray-700" />
    </div>
  );
}
