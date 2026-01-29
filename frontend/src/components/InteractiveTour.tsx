import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, Step, STATUS } from 'react-joyride';
import { useSettingsStore } from '../store/settingsStore';
import { useWorkflowStore } from '../store/workflowStore';

const TOUR_STEPS: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Welcome to AutoMFlows!</h3>
        <p className="text-gray-200">
          A visual workflow automation tool for browser automation, API testing, and database operations.
        </p>
        <p className="text-gray-300 text-sm">
          This tour will show you how to build and run automated workflows. Let's get started!
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
    disableOverlayClose: false,
    spotlightPadding: 0,
  },
  {
    target: '[data-tour="left-sidebar"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Node Palette</h3>
        <p className="text-gray-200">
          This is your toolbox. Drag nodes from here to build workflows.
        </p>
        <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
          <li>Categories: Browser, Interaction, API, Database, etc.</li>
          <li>Search functionality to find nodes quickly</li>
          <li>Collapsible sidebar to maximize canvas space</li>
        </ul>
        <p className="text-gray-400 text-xs italic mt-2">
          💡 Try searching for 'browser' to see browser-related nodes
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: false,
    disableOverlayClose: false,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="canvas"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Workflow Canvas</h3>
        <p className="text-gray-200">
          This is where you build your workflows.
        </p>
        <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
          <li>Drag nodes from sidebar onto canvas</li>
          <li>Connect nodes by dragging from output handles to input handles</li>
          <li>Click nodes to select and configure them</li>
          <li>Pan and zoom to navigate large workflows</li>
          <li>Right-click for context menu options</li>
        </ul>
      </div>
    ),
    placement: 'center',
    disableBeacon: false,
    disableOverlayClose: false,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="right-sidebar"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Node Configuration Panel</h3>
        <p className="text-gray-200">
          When you select a node, configure its properties here.
        </p>
        <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
          <li>Different nodes have different configuration options</li>
          <li>Properties like selectors, timeouts, actions</li>
          <li>Test mode toggle for individual nodes</li>
          <li>Validation errors shown here</li>
        </ul>
        <p className="text-gray-400 text-xs italic mt-2">
          💡 Select a node on the canvas to see its configuration options
        </p>
      </div>
    ),
    placement: 'left',
    disableBeacon: false,
    disableOverlayClose: false,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="run-button"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Run Your Workflow</h3>
        <p className="text-gray-200">
          Click this button to execute your workflow.
        </p>
        <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
          <li>Green play button when idle</li>
          <li>Red stop button when running</li>
          <li>Yellow pause indicator when paused at breakpoints</li>
          <li>Failed node navigation button appears when errors occur</li>
          <li>Keyboard shortcut: Space bar (when canvas focused)</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    disableOverlayClose: false,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="menu-button"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Menu & File Operations</h3>
        <p className="text-gray-200">
          Access file operations, settings, and more.
        </p>
        <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
          <li>Save/Load workflows (local file system)</li>
          <li>Reset to sample template</li>
          <li>Access settings and preferences</li>
          <li>View keyboard shortcuts</li>
          <li>Report history and configuration</li>
        </ul>
      </div>
    ),
    placement: 'top',
    disableBeacon: false,
    disableOverlayClose: false,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="menu-button"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Customize Your Experience</h3>
        <p className="text-gray-200">
          Adjust settings to match your preferences.
        </p>
        <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
          <li>Canvas settings: grid, auto-arrange, connection styles</li>
          <li>Appearance: theme (light/dark), font size, high contrast</li>
          <li>Notifications: audio alerts, notification preferences</li>
          <li>Report settings: default format, retention, auto-open</li>
          <li>Memory management options</li>
        </ul>
        <p className="text-gray-400 text-xs italic mt-2">
          💡 Open the menu and click "Settings" to explore options
        </p>
      </div>
    ),
    placement: 'top',
    disableBeacon: false,
    disableOverlayClose: false,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="menu-button"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Power User Shortcuts</h3>
        <p className="text-gray-200">
          Speed up your workflow with keyboard shortcuts.
        </p>
        <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
          <li><code className="bg-gray-700 px-1 rounded">Ctrl/Cmd + Z</code> - Undo</li>
          <li><code className="bg-gray-700 px-1 rounded">Ctrl/Cmd + Shift + Z</code> - Redo</li>
          <li><code className="bg-gray-700 px-1 rounded">Ctrl/Cmd + B</code> - Toggle breakpoint mode</li>
          <li><code className="bg-gray-700 px-1 rounded">Ctrl/Cmd + Shift + F</code> - Navigate to failed node</li>
          <li><code className="bg-gray-700 px-1 rounded">Ctrl/Cmd + H</code> - Open report history</li>
          <li><code className="bg-gray-700 px-1 rounded">Space</code> - Run workflow (when canvas focused)</li>
        </ul>
        <p className="text-gray-400 text-xs italic mt-2">
          💡 Open the menu and click "Keyboard Shortcuts" for the full list
        </p>
      </div>
    ),
    placement: 'top',
    disableBeacon: false,
    disableOverlayClose: false,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="canvas"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Ready to Build!</h3>
        <p className="text-gray-200">
          Here's a quick workflow to get you started:
        </p>
        <ol className="text-gray-300 text-sm list-decimal list-inside space-y-1">
          <li>Drag "Start" node to canvas</li>
          <li>Drag "Open Browser" node and connect it</li>
          <li>Drag "Navigation" node and connect it</li>
          <li>Click "Run" to execute</li>
        </ol>
        <p className="text-gray-400 text-xs italic mt-2">
          💡 Try the "Reset" button in the menu to load a sample template
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: false,
    disableOverlayClose: false,
    spotlightPadding: 4,
  },
  {
    target: 'body',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">You're All Set!</h3>
        <p className="text-gray-200">
          You now know the basics of AutoMFlows.
        </p>
        <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
          <li>Try the sample template (Reset button)</li>
          <li>Explore different node types</li>
          <li>Check out the documentation</li>
          <li>Restart this tour anytime from the menu</li>
        </ul>
        <p className="text-gray-400 text-xs italic mt-2">
          Happy automating! 🚀
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
    disableOverlayClose: false,
    spotlightPadding: 0,
  },
];

export default function InteractiveTour() {
  const { showTour, completeTour, tourCompleted, startTour } = useSettingsStore();
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const [runTour, setRunTour] = useState(false);

  // Auto-start tour on first visit (if not completed)
  useEffect(() => {
    if (!tourCompleted && !showTour && !runTour) {
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tourCompleted, showTour, runTour, startTour]);

  // Start tour when showTour becomes true
  useEffect(() => {
    if (showTour && !runTour) {
      setRunTour(true);
    }
  }, [showTour, runTour]);

  // Handle tour callbacks
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action } = data;

    // Handle step navigation - skip step 3 (right sidebar) if no node is selected
    if (action === 'next' && index === 3 && !selectedNode) {
      // Joyride will handle skipping via the filtered steps
      return;
    }

    // Handle tour completion or skip
    if (
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      setRunTour(false);
      completeTour();
    }
  };

  // Filter steps based on conditions
  const getSteps = (): Step[] => {
    const steps = [...TOUR_STEPS];
    
    // Modify step 3 (right sidebar) if no node is selected
    if (!selectedNode) {
      steps[3] = {
        ...steps[3],
        target: '[data-tour="canvas"]',
        content: (
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Node Configuration Panel</h3>
            <p className="text-gray-200">
              When you select a node, configure its properties here.
            </p>
            <p className="text-gray-300 text-sm">
              Select a node on the canvas to see its configuration options in the right sidebar.
            </p>
            <p className="text-gray-400 text-xs italic mt-2">
              💡 The right sidebar appears automatically when you select a node
            </p>
          </div>
        ),
        placement: 'center',
      };
    }
    
    return steps;
  };

  if (!runTour) {
    return null;
  }

  return (
    <Joyride
      steps={getSteps()}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3B82F6', // blue-500
          zIndex: 10000, // Above modals but below critical overlays
        },
        tooltip: {
          backgroundColor: '#1F2937', // gray-800
          borderRadius: '8px',
          color: '#F3F4F6', // gray-100
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          color: '#FFFFFF',
        },
        buttonNext: {
          backgroundColor: '#3B82F6', // blue-500
          color: '#FFFFFF',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
        },
        buttonBack: {
          color: '#9CA3AF', // gray-400
          marginRight: '8px',
          fontSize: '14px',
        },
        buttonSkip: {
          color: '#9CA3AF', // gray-400
          fontSize: '14px',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        spotlight: {
          borderRadius: '8px',
        },
      }}
      floaterProps={{
        disableAnimation: false,
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}
