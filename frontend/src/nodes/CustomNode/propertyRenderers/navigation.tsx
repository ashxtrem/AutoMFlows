import { InlineTextInput, InlineNumberInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderNavigationProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const navAction = renderData.action || 'navigate';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={navAction}
          onChange={(value) => {
            handlePropertyChange('action', value);
            // Clear action-specific properties when action changes
            if (value !== 'navigate' && value !== 'newTab') {
              handlePropertyChange('url', undefined);
            }
            if (value !== 'navigate') {
              handlePropertyChange('referer', undefined);
            }
            if (value !== 'navigate' && value !== 'goBack' && value !== 'goForward' && value !== 'reload') {
              handlePropertyChange('waitUntil', undefined);
            }
            if (value !== 'switchTab') {
              handlePropertyChange('tabIndex', undefined);
              handlePropertyChange('urlPattern', undefined);
            }
            if (value !== 'closeTab') {
              handlePropertyChange('tabIndex', undefined);
            }
          }}
          options={[
            { label: 'Navigate', value: 'navigate' },
            { label: 'Go Back', value: 'goBack' },
            { label: 'Go Forward', value: 'goForward' },
            { label: 'Reload', value: 'reload' },
            { label: 'New Tab', value: 'newTab' },
            { label: 'Switch Tab', value: 'switchTab' },
            { label: 'Close Tab', value: 'closeTab' },
          ]}
        />
      ), 0)}
      {(navAction === 'navigate' || navAction === 'newTab') && renderPropertyRow('url', (
        <InlineTextInput
          label="URL"
          value={renderData.url || ''}
          onChange={(value) => handlePropertyChange('url', value)}
          placeholder="https://example.com"
          field="url"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {navAction === 'navigate' && renderPropertyRow('referer', (
        <InlineTextInput
          label="Referer"
          value={renderData.referer || ''}
          onChange={(value) => handlePropertyChange('referer', value)}
          placeholder="https://referer.com"
          field="referer"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {(navAction === 'navigate' || navAction === 'goBack' || navAction === 'goForward' || navAction === 'reload') && renderPropertyRow('waitUntil', (
        <InlineSelect
          label="Wait Until"
          value={renderData.waitUntil || 'networkidle'}
          onChange={(value) => handlePropertyChange('waitUntil', value)}
          options={[
            { label: 'Load', value: 'load' },
            { label: 'DOMContentLoaded', value: 'domcontentloaded' },
            { label: 'Network Idle', value: 'networkidle' },
            { label: 'Commit', value: 'commit' },
          ]}
        />
      ), 3)}
      {navAction === 'switchTab' && renderPropertyRow('tabIndex', (
        <InlineNumberInput
          label="Tab Index"
          value={renderData.tabIndex !== undefined ? renderData.tabIndex : ''}
          onChange={(value) => handlePropertyChange('tabIndex', value !== '' ? value : undefined)}
          placeholder="Leave empty for URL pattern"
          field="tabIndex"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {navAction === 'switchTab' && renderPropertyRow('urlPattern', (
        <InlineTextInput
          label="URL Pattern"
          value={renderData.urlPattern || ''}
          onChange={(value) => handlePropertyChange('urlPattern', value)}
          placeholder="/example\.com/ or example.com"
          field="urlPattern"
          onOpenPopup={handleOpenPopup}
        />
      ), 4)}
      {navAction === 'closeTab' && renderPropertyRow('tabIndex', (
        <InlineNumberInput
          label="Tab Index"
          value={renderData.tabIndex !== undefined ? renderData.tabIndex : ''}
          onChange={(value) => handlePropertyChange('tabIndex', value !== '' ? value : undefined)}
          placeholder="Leave empty for current tab"
          field="tabIndex"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {renderPropertyRow('timeout', (
        <InlineNumberInput
          label="Timeout"
          value={renderData.timeout || 30000}
          onChange={(value) => handlePropertyChange('timeout', value)}
          placeholder="30000"
          field="timeout"
          onOpenPopup={handleOpenPopup}
        />
      ), 5)}
    </div>
  );
};
