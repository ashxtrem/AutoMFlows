import { useWorkflowStore } from '../store/workflowStore';
import { useNotificationStore } from '../store/notificationStore';

export default function BreakpointSettings() {
  const {
    breakpointEnabled,
    breakpointAt,
    breakpointFor,
    setBreakpointSettings,
  } = useWorkflowStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleBreakpointToggle = (enabled: boolean) => {
    setBreakpointSettings({ enabled });
    addNotification({
      type: 'info',
      title: 'Breakpoint',
      message: enabled ? 'Breakpoint enabled' : 'Breakpoint disabled',
    });
  };

  const handleBreakpointAtChange = (value: 'pre' | 'post' | 'both') => {
    setBreakpointSettings({ breakpointAt: value });
    addNotification({
      type: 'info',
      title: 'Breakpoint Settings Updated',
      message: `Breakpoint at: ${value}`,
    });
  };

  const handleBreakpointForChange = (value: 'all' | 'marked') => {
    setBreakpointSettings({ breakpointFor: value });
    addNotification({
      type: 'info',
      title: 'Breakpoint Settings Updated',
      message: `Breakpoint for: ${value === 'all' ? 'All Nodes' : 'Marked Nodes'}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Breakpoint Enable Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">Enable Breakpoints</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={breakpointEnabled}
            onChange={(e) => handleBreakpointToggle(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-14 h-7 rounded-lg transition-colors flex items-center px-1 cursor-pointer ${
              breakpointEnabled ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md bg-white transition-transform duration-200 ${
                breakpointEnabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Breakpoint At</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="breakpointAt"
              value="pre"
              checked={breakpointAt === 'pre'}
              onChange={() => handleBreakpointAtChange('pre')}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Pre (before node execution)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="breakpointAt"
              value="post"
              checked={breakpointAt === 'post'}
              onChange={() => handleBreakpointAtChange('post')}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Post (after node execution)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="breakpointAt"
              value="both"
              checked={breakpointAt === 'both'}
              onChange={() => handleBreakpointAtChange('both')}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Both (before and after)</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Enable For</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="breakpointFor"
              value="all"
              checked={breakpointFor === 'all'}
              onChange={() => handleBreakpointForChange('all')}
              className="rounded"
            />
            <span className="text-sm text-gray-300">All Nodes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="breakpointFor"
              value="marked"
              checked={breakpointFor === 'marked'}
              onChange={() => handleBreakpointForChange('marked')}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Marked Nodes Only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
