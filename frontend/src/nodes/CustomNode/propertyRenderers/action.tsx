import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea } from '../../../components/InlinePropertyEditor';
import SelectorModifiersEditor from '../../../components/SelectorModifiersEditor';
import { getSelectorPlaceholder, SELECTOR_TYPE_OPTIONS } from '../../../utils/selectorHelpers';
import { PropertyRenderer } from './types';

export const renderActionProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const action = renderData.action || 'click';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={action}
          onChange={(value) => {
            handlePropertyChange('action', value);
            // Clear action-specific properties when action changes
            if (value !== 'click' && value !== 'rightClick') {
              handlePropertyChange('button', undefined);
            }
            if (value !== 'hover' && value !== 'doubleClick') {
              handlePropertyChange('delay', undefined);
            }
            if (value !== 'dragAndDrop') {
              handlePropertyChange('targetSelector', undefined);
              handlePropertyChange('targetSelectorType', undefined);
              handlePropertyChange('targetX', undefined);
              handlePropertyChange('targetY', undefined);
            }
          }}
          options={[
            { label: 'Click', value: 'click' },
            { label: 'Double Click', value: 'doubleClick' },
            { label: 'Right Click', value: 'rightClick' },
            { label: 'Hover', value: 'hover' },
            { label: 'Drag and Drop', value: 'dragAndDrop' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('selectorType', (
        <InlineSelect
          label="Selector Type"
          value={renderData.selectorType || 'css'}
          onChange={(value) => handlePropertyChange('selectorType', value)}
          options={SELECTOR_TYPE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      ), 1)}
      {renderPropertyRow('selector', (
        <InlineTextInput
          label="Selector"
          value={renderData.selector || ''}
          onChange={(value) => handlePropertyChange('selector', value)}
          placeholder={getSelectorPlaceholder(renderData.selectorType || 'css')}
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {renderPropertyRow('selectorModifiers', (
        <SelectorModifiersEditor
          value={renderData.selectorModifiers}
          onChange={(v) => handlePropertyChange('selectorModifiers', v)}
          compact
        />
      ), 3)}
      {(action === 'click' || action === 'rightClick') && renderPropertyRow('button', (
        <InlineSelect
          label="Button"
          value={renderData.button || 'left'}
          onChange={(value) => handlePropertyChange('button', value)}
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
            { label: 'Middle', value: 'middle' },
          ]}
        />
      ), 3)}
      {(action === 'hover' || action === 'doubleClick') && renderPropertyRow('delay', (
        <InlineNumberInput
          label="Delay (ms)"
          value={renderData.delay || 0}
          onChange={(value) => handlePropertyChange('delay', value)}
          placeholder="0"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {action === 'dragAndDrop' && (
        <>
          {renderPropertyRow('targetSelectorType', (
            <InlineSelect
              label="Target Selector Type"
              value={renderData.targetSelectorType || 'css'}
              onChange={(value) => handlePropertyChange('targetSelectorType', value)}
              options={[
                { label: 'CSS', value: 'css' },
                { label: 'XPath', value: 'xpath' },
              ]}
            />
          ), 4)}
          {renderPropertyRow('targetSelector', (
            <InlineTextInput
              label="Target Selector"
              value={renderData.targetSelector || ''}
              onChange={(value) => handlePropertyChange('targetSelector', value)}
              placeholder={getSelectorPlaceholder(renderData.targetSelectorType || 'css')}
              onOpenPopup={handleOpenPopup}
            />
          ), 5)}
          {renderPropertyRow('targetSelectorModifiers', (
            <SelectorModifiersEditor
              value={renderData.targetSelectorModifiers}
              onChange={(v) => handlePropertyChange('targetSelectorModifiers', v)}
              compact
            />
          ), 6)}
          {(renderData.targetX !== undefined || renderData.targetY !== undefined) && (
            <>
              {renderPropertyRow('targetX', (
                <InlineNumberInput
                  label="Target X"
                  value={renderData.targetX || 0}
                  onChange={(value) => handlePropertyChange('targetX', value)}
                  placeholder="X coordinate"
                  onOpenPopup={handleOpenPopup}
                />
              ), 6)}
              {renderPropertyRow('targetY', (
                <InlineNumberInput
                  label="Target Y"
                  value={renderData.targetY || 0}
                  onChange={(value) => handlePropertyChange('targetY', value)}
                  placeholder="Y coordinate"
                  onOpenPopup={handleOpenPopup}
                />
              ), 7)}
            </>
          )}
        </>
      )}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          onOpenPopup={handleOpenPopup}
        />
      ), action === 'dragAndDrop' ? (renderData.targetX !== undefined || renderData.targetY !== undefined ? 8 : 6) : (action === 'click' || action === 'rightClick' ? 4 : (action === 'hover' || action === 'doubleClick' ? 4 : 3)))}
      {renderData.waitForSelector && renderPropertyRow('waitForSelector', (
        <InlineTextInput
          label="Wait Selector"
          value={renderData.waitForSelector || ''}
          onChange={(value) => handlePropertyChange('waitForSelector', value)}
          placeholder=".my-class"
          onOpenPopup={handleOpenPopup}
        />
      ), 5)}
      {renderData.waitForSelector && renderPropertyRow('waitForSelectorType', (
        <InlineSelect
          label="Wait Selector Type"
          value={renderData.waitForSelectorType || 'css'}
          onChange={(value) => handlePropertyChange('waitForSelectorType', value)}
          options={SELECTOR_TYPE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      ), 6)}
      {renderData.waitForUrl && renderPropertyRow('waitForUrl', (
        <InlineTextInput
          label="Wait URL"
          value={renderData.waitForUrl || ''}
          onChange={(value) => handlePropertyChange('waitForUrl', value)}
          placeholder="/pattern/ or exact-url"
          onOpenPopup={handleOpenPopup}
        />
      ), 7)}
      {renderData.waitForCondition && renderPropertyRow('waitForCondition', (
        <InlineTextarea
          label="Wait Condition"
          value={renderData.waitForCondition || ''}
          onChange={(value) => handlePropertyChange('waitForCondition', value)}
          placeholder="() => document.querySelector('.loaded')"
          onOpenPopup={handleOpenPopup}
        />
      ), 8)}
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
      ), 9)}
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
      ), 10)}
      {renderData.retryEnabled && renderData.retryStrategy === 'count' && renderPropertyRow('retryCount', (
        <InlineNumberInput
          label="Retry Count"
          value={renderData.retryCount || 3}
          onChange={(value) => handlePropertyChange('retryCount', value)}
          placeholder="3"
          onOpenPopup={handleOpenPopup}
        />
      ), 11)}
    </div>
  );
};
