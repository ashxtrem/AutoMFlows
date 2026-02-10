import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea } from '../../../components/InlinePropertyEditor';
import { getSelectorPlaceholder, SELECTOR_TYPE_OPTIONS } from '../../../utils/selectorHelpers';
import { PropertyRenderer } from './types';

export const renderTypeProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('selectorType', (
        <InlineSelect
          label="Selector Type"
          value={renderData.selectorType || 'css'}
          onChange={(value) => handlePropertyChange('selectorType', value)}
          options={SELECTOR_TYPE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      ), 0)}
      {renderPropertyRow('selector', (
        <InlineTextInput
          label="Selector"
          value={renderData.selector || ''}
          onChange={(value) => handlePropertyChange('selector', value)}
          placeholder={getSelectorPlaceholder(renderData.selectorType || 'css')}
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderPropertyRow('inputMethod', (
        <InlineSelect
          label="Input Method"
          value={renderData.inputMethod || 'fill'}
          onChange={(value) => handlePropertyChange('inputMethod', value)}
          options={[
            { label: 'Fill', value: 'fill' },
            { label: 'Type', value: 'type' },
            { label: 'Press Sequentially', value: 'pressSequentially' },
            { label: 'Append', value: 'append' },
            { label: 'Prepend', value: 'prepend' },
            { label: 'Direct', value: 'direct' },
          ]}
        />
      ), 2)}
      {renderPropertyRow('text', (
        <InlineTextarea
          label="Text"
          value={renderData.text || ''}
          onChange={(value) => handlePropertyChange('text', value)}
          placeholder="Text to type"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {(renderData.inputMethod === 'type' || renderData.inputMethod === 'pressSequentially') && renderPropertyRow('delay', (
        <InlineNumberInput
          label="Delay (ms)"
          value={renderData.delay || 0}
          onChange={(value) => handlePropertyChange('delay', value)}
          placeholder="0"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          onOpenPopup={handleOpenPopup}
        />
      ), (renderData.inputMethod === 'type' || renderData.inputMethod === 'pressSequentially') ? 5 : 4)}
      {renderData.waitForSelector && renderPropertyRow('waitForSelector', (
        <InlineTextInput
          label="Wait Selector"
          value={renderData.waitForSelector || ''}
          onChange={(value) => handlePropertyChange('waitForSelector', value)}
          placeholder=".my-class"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
      {renderData.waitForSelector && renderPropertyRow('waitForSelectorType', (
        <InlineSelect
          label="Wait Selector Type"
          value={renderData.waitForSelectorType || 'css'}
          onChange={(value) => handlePropertyChange('waitForSelectorType', value)}
          options={SELECTOR_TYPE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
        />
      ), 5)}
      {renderData.waitForUrl && renderPropertyRow('waitForUrl', (
        <InlineTextInput
          label="Wait URL"
          value={renderData.waitForUrl || ''}
          onChange={(value) => handlePropertyChange('waitForUrl', value)}
          placeholder="/pattern/ or exact-url"
          onOpenPopup={handleOpenPopup}
        />
      ), 6)}
      {renderData.waitForCondition && renderPropertyRow('waitForCondition', (
        <InlineTextarea
          label="Wait Condition"
          value={renderData.waitForCondition || ''}
          onChange={(value) => handlePropertyChange('waitForCondition', value)}
          placeholder="() => document.querySelector('.loaded')"
          onOpenPopup={handleOpenPopup}
        />
      ), 7)}
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
      ), 8)}
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
      ), 9)}
      {renderData.retryEnabled && renderData.retryStrategy === 'count' && renderPropertyRow('retryCount', (
        <InlineNumberInput
          label="Retry Count"
          value={renderData.retryCount || 3}
          onChange={(value) => handlePropertyChange('retryCount', value)}
          placeholder="3"
          onOpenPopup={handleOpenPopup}
        />
      ), 10)}
    </div>
  );
};
