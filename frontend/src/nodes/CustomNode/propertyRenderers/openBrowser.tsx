import { OpenBrowserNodeData } from '@automflows/shared';
import { InlineCheckbox, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderOpenBrowserProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow, setShowCapabilitiesPopup }) => {
  const browserData = renderData as OpenBrowserNodeData;
  const maxWindow = browserData.maxWindow !== false; // Default to true
  const capabilitiesCount = browserData.capabilities ? Object.keys(browserData.capabilities).length : 0;
  const launchOptionsCount = browserData.launchOptions ? Object.keys(browserData.launchOptions).length : 0;
  
  return (
    <>
      <div className="mt-2 space-y-1">
        {renderPropertyRow('browser', (
          <InlineSelect
            label="Browser"
            value={browserData.browser || 'chromium'}
            onChange={(value) => handlePropertyChange('browser', value)}
            options={[
              { label: 'Chromium', value: 'chromium' },
              { label: 'Firefox', value: 'firefox' },
              { label: 'WebKit', value: 'webkit' },
            ]}
          />
        ), 0)}
        {renderPropertyRow('maxWindow', (
          <InlineCheckbox
            label="Max Window"
            value={maxWindow}
            onChange={(value) => {
              handlePropertyChange('maxWindow', value);
              // If disabling max window, set default viewport if not set
              if (!value && !browserData.viewportWidth && !browserData.viewportHeight) {
                handlePropertyChange('viewportWidth', 1280);
                handlePropertyChange('viewportHeight', 720);
              }
            }}
          />
        ), 1)}
        {!maxWindow && renderPropertyRow('viewportWidth', (
          <InlineNumberInput
            label="Width"
            value={browserData.viewportWidth || 1280}
            onChange={(value) => handlePropertyChange('viewportWidth', value)}
            placeholder="1280"
            onOpenPopup={handleOpenPopup}
          />
        ), 2)}
        {!maxWindow && renderPropertyRow('viewportHeight', (
          <InlineNumberInput
            label="Height"
            value={browserData.viewportHeight || 720}
            onChange={(value) => handlePropertyChange('viewportHeight', value)}
            placeholder="720"
            onOpenPopup={handleOpenPopup}
          />
        ), 3)}
        {renderPropertyRow('headless', (
          <InlineCheckbox
            label="Headless"
            value={browserData.headless !== false}
            onChange={(value) => handlePropertyChange('headless', value)}
          />
        ), 4)}
        {renderPropertyRow('stealthMode', (
          <InlineCheckbox
            label="Stealth Mode"
            value={browserData.stealthMode || false}
            onChange={(value) => handlePropertyChange('stealthMode', value)}
          />
        ), 5)}
        {/* View/Add Options button - rendered directly, NOT via renderPropertyRow */}
        {setShowCapabilitiesPopup && (
          <div className="mt-1">
            <button
              onClick={() => {
                setShowCapabilitiesPopup(true);
              }}
              className="w-full px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-blue-500 rounded text-white transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              View/Add Options
              {(capabilitiesCount > 0 || launchOptionsCount > 0) && (
                <span className="ml-2 text-blue-400">
                  (C:{capabilitiesCount}, L:{launchOptionsCount})
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
