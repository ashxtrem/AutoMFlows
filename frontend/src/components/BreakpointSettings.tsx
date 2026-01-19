import { useWorkflowStore } from '../store/workflowStore';
import { useNotificationStore } from '../store/notificationStore';

export default function BreakpointSettings() {
  const {
    breakpointAt,
    breakpointFor,
    setBreakpointSettings,
  } = useWorkflowStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

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
