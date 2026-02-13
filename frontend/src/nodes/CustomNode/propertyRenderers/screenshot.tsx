import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea, InlineCheckbox } from '../../../components/InlinePropertyEditor';
import { SELECTOR_TYPE_OPTIONS } from '../../../utils/selectorHelpers';
import { PropertyRenderer } from './types';

export const renderScreenshotProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const screenshotAction = renderData.action || (renderData.fullPage ? 'fullPage' : 'viewport');
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={screenshotAction}
          onChange={(value) => {
            handlePropertyChange('action', value);
            if (value !== 'element') {
              handlePropertyChange('selector', undefined);
            }
            if (value !== 'pdf') {
              handlePropertyChange('format', undefined);
            }
            // Legacy: update fullPage
            handlePropertyChange('fullPage', value === 'fullPage');
          }}
          options={[
            { label: 'Full Page', value: 'fullPage' },
            { label: 'Viewport', value: 'viewport' },
            { label: 'Element', value: 'element' },
            { label: 'PDF', value: 'pdf' },
          ]}
        />
      ), 0)}
      {screenshotAction === 'element' && renderPropertyRow('selector', (
        <InlineTextInput
          label="Selector"
          value={renderData.selector || ''}
          onChange={(value) => handlePropertyChange('selector', value)}
          placeholder="#element"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {/* Legacy: Keep fullPage checkbox for backward compatibility */}
      {!renderData.action && renderPropertyRow('fullPage', (
        <InlineCheckbox
          label="Full Page"
          value={renderData.fullPage || false}
          onChange={(value) => {
            handlePropertyChange('fullPage', value);
            handlePropertyChange('action', value ? 'fullPage' : 'viewport');
          }}
        />
      ), 1)}
      {renderPropertyRow('path', (
        <InlineTextInput
          label="Path"
          value={renderData.path || ''}
          onChange={(value) => handlePropertyChange('path', value)}
          placeholder="screenshot.png (optional)"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderData.waitForSelector && renderPropertyRow('waitForSelector', (
        <InlineTextInput
          label="Wait Selector"
          value={renderData.waitForSelector || ''}
          onChange={(value) => handlePropertyChange('waitForSelector', value)}
          placeholder=".my-class"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {renderData.waitForSelector && renderPropertyRow('waitForSelectorType', (
        <InlineSelect
          label="Wait Selector Type"
          value={renderData.waitForSelectorType || 'css'}
          onChange={(value) => handlePropertyChange('waitForSelectorType', value)}
          options={SELECTOR_TYPE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      ), 3)}
      {renderData.waitForUrl && renderPropertyRow('waitForUrl', (
        <InlineTextInput
          label="Wait URL"
          value={renderData.waitForUrl || ''}
          onChange={(value) => handlePropertyChange('waitForUrl', value)}
          placeholder="/pattern/ or exact-url"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
      {renderData.waitForCondition && renderPropertyRow('waitForCondition', (
        <InlineTextarea
          label="Wait Condition"
          value={renderData.waitForCondition || ''}
          onChange={(value) => handlePropertyChange('waitForCondition', value)}
          placeholder="() => document.querySelector('.loaded')"
          onOpenPopup={handleOpenPopup}
        />
      ), 5)}
      {(renderData.waitForSelector || renderData.waitForUrl || renderData.waitForCondition) && renderPropertyRow('waitStrategy', (
        <InlineSelect
          label="Wait Strategy"
          value={renderData.waitStrategy || 'parallel'}
          onChange={(value) => handlePropertyChange('waitStrategy', value)}
          options={[
            { label: 'Parallel', value: 'parallel' },
            { label: 'Sequential', value: 'sequential' },
          ]}
        />
      ), 6)}
      {renderData.retryEnabled && renderPropertyRow('retryStrategy', (
        <InlineSelect
          label="Retry Strategy"
          value={renderData.retryStrategy || 'count'}
          onChange={(value) => handlePropertyChange('retryStrategy', value)}
          options={[
            { label: 'Count', value: 'count' },
            { label: 'Until Condition', value: 'untilCondition' },
          ]}
        />
      ), 7)}
      {renderData.retryEnabled && renderData.retryStrategy === 'count' && renderPropertyRow('retryCount', (
        <InlineNumberInput
          label="Retry Count"
          value={renderData.retryCount || 3}
          onChange={(value) => handlePropertyChange('retryCount', value)}
          placeholder="3"
          onOpenPopup={handleOpenPopup}
        />
      ), 8)}
    </div>
  );
};
