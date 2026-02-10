import { InlineTextInput, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderScrollProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const scrollAction = renderData.action || 'scrollToElement';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={scrollAction}
          onChange={(value) => {
            handlePropertyChange('action', value);
            if (value !== 'scrollToElement') {
              handlePropertyChange('selector', undefined);
            }
            if (value !== 'scrollToPosition') {
              handlePropertyChange('x', undefined);
              handlePropertyChange('y', undefined);
            }
            if (value !== 'scrollBy') {
              handlePropertyChange('deltaX', undefined);
              handlePropertyChange('deltaY', undefined);
            }
          }}
          options={[
            { label: 'To Element', value: 'scrollToElement' },
            { label: 'To Position', value: 'scrollToPosition' },
            { label: 'By', value: 'scrollBy' },
            { label: 'To Top', value: 'scrollToTop' },
            { label: 'To Bottom', value: 'scrollToBottom' },
          ]}
        />
      ), 0)}
      {scrollAction === 'scrollToElement' && renderPropertyRow('selector', (
        <InlineTextInput
          label="Selector"
          value={renderData.selector || ''}
          onChange={(value) => handlePropertyChange('selector', value)}
          placeholder="#element"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {scrollAction === 'scrollToPosition' && (
        <>
          {renderPropertyRow('x', (
            <InlineNumberInput
              label="X"
              value={renderData.x || 0}
              onChange={(value) => handlePropertyChange('x', value)}
              placeholder="0"
              onOpenPopup={handleOpenPopup}
            />
          ), 1)}
          {renderPropertyRow('y', (
            <InlineNumberInput
              label="Y"
              value={renderData.y || 0}
              onChange={(value) => handlePropertyChange('y', value)}
              placeholder="0"
              onOpenPopup={handleOpenPopup}
            />
          ), 2)}
        </>
      )}
      {scrollAction === 'scrollBy' && (
        <>
          {renderPropertyRow('deltaX', (
            <InlineNumberInput
              label="Delta X"
              value={renderData.deltaX || 0}
              onChange={(value) => handlePropertyChange('deltaX', value)}
              placeholder="0"
              onOpenPopup={handleOpenPopup}
            />
          ), 1)}
          {renderPropertyRow('deltaY', (
            <InlineNumberInput
              label="Delta Y"
              value={renderData.deltaY || 0}
              onChange={(value) => handlePropertyChange('deltaY', value)}
              placeholder="0"
              onOpenPopup={handleOpenPopup}
            />
          ), 2)}
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
      ), 3)}
    </div>
  );
};
