import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea } from '../../../components/InlinePropertyEditor';
import { getSelectorPlaceholder } from '../../../utils/selectorHelpers';
import { PropertyRenderer } from './types';

export const renderWaitProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('waitType', (
        <InlineSelect
          label="Wait Type"
          value={renderData.waitType || 'timeout'}
          onChange={(value) => handlePropertyChange('waitType', value)}
          options={[
            { label: 'Timeout', value: 'timeout' },
            { label: 'Selector', value: 'selector' },
            { label: 'URL Pattern', value: 'url' },
            { label: 'JavaScript Condition', value: 'condition' },
          ]}
        />
      ), 0)}
      {renderData.waitType === 'timeout' ? (
        renderPropertyRow('value', (
          <InlineNumberInput
            label="Value (ms)"
            value={typeof renderData.value === 'number' ? renderData.value : parseInt(String(renderData.value || 1000), 10)}
            onChange={(value) => handlePropertyChange('value', value)}
            placeholder="1000"
            onOpenPopup={handleOpenPopup}
          />
        ), 1)
      ) : renderData.waitType === 'selector' ? (
        <>
          {renderPropertyRow('selectorType', (
            <InlineSelect
              label="Selector Type"
              value={renderData.selectorType || 'css'}
              onChange={(value) => handlePropertyChange('selectorType', value)}
              options={[
                { label: 'CSS', value: 'css' },
                { label: 'XPath', value: 'xpath' },
              ]}
            />
          ), 1)}
          {renderPropertyRow('value', (
            <InlineTextInput
              label="Selector"
              value={typeof renderData.value === 'string' ? renderData.value : ''}
              onChange={(value) => handlePropertyChange('value', value)}
              placeholder={getSelectorPlaceholder(renderData.selectorType || 'css')}
              onOpenPopup={handleOpenPopup}
            />
          ), 2)}
          {renderPropertyRow('timeout', (
            <InlineNumberInput
              label="Timeout"
              value={renderData.timeout || 30000}
              onChange={(value) => handlePropertyChange('timeout', value)}
              placeholder="30000"
              onOpenPopup={handleOpenPopup}
            />
          ), 3)}
        </>
      ) : renderData.waitType === 'url' ? (
        <>
          {renderPropertyRow('value', (
            <InlineTextInput
              label="URL Pattern"
              value={typeof renderData.value === 'string' ? renderData.value : ''}
              onChange={(value) => handlePropertyChange('value', value)}
              placeholder="/pattern/ or exact-url"
              onOpenPopup={handleOpenPopup}
            />
          ), 1)}
          {renderPropertyRow('timeout', (
            <InlineNumberInput
              label="Timeout"
              value={renderData.timeout || 30000}
              onChange={(value) => handlePropertyChange('timeout', value)}
              placeholder="30000"
              onOpenPopup={handleOpenPopup}
            />
          ), 2)}
        </>
      ) : (
        <>
          {renderPropertyRow('value', (
            <InlineTextarea
              label="Condition"
              value={typeof renderData.value === 'string' ? renderData.value : ''}
              onChange={(value) => handlePropertyChange('value', value)}
              placeholder="() => document.querySelector('.loaded')"
              onOpenPopup={handleOpenPopup}
            />
          ), 1)}
          {renderPropertyRow('timeout', (
            <InlineNumberInput
              label="Timeout"
              value={renderData.timeout || 30000}
              onChange={(value) => handlePropertyChange('timeout', value)}
              placeholder="30000"
              onOpenPopup={handleOpenPopup}
            />
          ), 2)}
        </>
      )}
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
      ), 3)}
      {renderData.retryEnabled && renderData.retryStrategy === 'count' && renderPropertyRow('retryCount', (
        <InlineNumberInput
          label="Retry Count"
          value={renderData.retryCount || 3}
          onChange={(value) => handlePropertyChange('retryCount', value)}
          placeholder="3"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
    </div>
  );
};
