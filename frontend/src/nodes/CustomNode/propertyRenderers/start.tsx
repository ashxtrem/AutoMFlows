import { InlineCheckbox, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderStartProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('recordSession', (
        <InlineCheckbox
          label="Record Session"
          value={renderData.recordSession || false}
          onChange={(value) => handlePropertyChange('recordSession', value)}
        />
      ), 0)}
      {renderPropertyRow('screenshotAllNodes', (
        <InlineCheckbox
          label="Screenshot All Nodes"
          value={renderData.screenshotAllNodes || false}
          onChange={(value) => handlePropertyChange('screenshotAllNodes', value)}
        />
      ), 1)}
      {renderData.screenshotAllNodes && renderPropertyRow('screenshotTiming', (
        <InlineSelect
          label="Screenshot Timing"
          value={renderData.screenshotTiming || 'post'}
          onChange={(value) => handlePropertyChange('screenshotTiming', value)}
          options={[
            { label: 'Pre', value: 'pre' },
            { label: 'Post', value: 'post' },
            { label: 'Both', value: 'both' },
          ]}
        />
      ), 2)}
      {renderPropertyRow('slowMo', (
        <InlineNumberInput
          label="Slowmo (ms)"
          value={renderData.slowMo || 0}
          onChange={(value) => handlePropertyChange('slowMo', value)}
          min={0}
          placeholder="Delay between nodes"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {renderPropertyRow('scrollThenAction', (
        <InlineCheckbox
          label="Scroll Then Action"
          value={renderData.scrollThenAction || false}
          onChange={(value) => handlePropertyChange('scrollThenAction', value)}
        />
      ), 4)}
    </div>
  );
};
