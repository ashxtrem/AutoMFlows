import { InlineTextInput, InlineNumberInput, InlineSelect, InlineTextarea } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderContextManipulateProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  const contextAction = renderData.action || 'setGeolocation';
  
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('action', (
        <InlineSelect
          label="Action"
          value={contextAction}
          onChange={(value) => handlePropertyChange('action', value)}
          options={[
            { label: 'Set Geolocation', value: 'setGeolocation' },
            { label: 'Set Permissions', value: 'setPermissions' },
            { label: 'Clear Permissions', value: 'clearPermissions' },
            { label: 'Set Viewport Size', value: 'setViewportSize' },
            { label: 'Set User Agent', value: 'setUserAgent' },
            { label: 'Set Locale', value: 'setLocale' },
            { label: 'Set Timezone', value: 'setTimezone' },
            { label: 'Set Color Scheme', value: 'setColorScheme' },
            { label: 'Set Extra HTTP Headers', value: 'setExtraHTTPHeaders' },
            { label: 'Add Init Script', value: 'addInitScript' },
            { label: 'Create Context', value: 'createContext' },
            { label: 'Switch Context', value: 'switchContext' },
            { label: 'Save State', value: 'saveState' },
            { label: 'Load State', value: 'loadState' },
            { label: 'Emulate Device', value: 'emulateDevice' },
          ]}
        />
      ), 0)}
      {(contextAction === 'createContext' || contextAction === 'switchContext' || contextAction === 'loadState' || contextAction === 'emulateDevice') && renderPropertyRow('contextKey', (
        <InlineTextInput
          label="Context Key"
          value={renderData.contextKey || ''}
          onChange={(value) => handlePropertyChange('contextKey', value)}
          placeholder="default"
          field="contextKey"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {(contextAction === 'saveState' || contextAction === 'loadState') && renderPropertyRow('stateFilePath', (
        <InlineTextInput
          label="State File Path"
          value={renderData.stateFilePath || ''}
          onChange={(value) => handlePropertyChange('stateFilePath', value)}
          placeholder="./state/auth-state.json"
          field="stateFilePath"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {contextAction === 'emulateDevice' && renderPropertyRow('device', (
        <InlineTextInput
          label="Device"
          value={renderData.device || ''}
          onChange={(value) => handlePropertyChange('device', value)}
          placeholder="iPhone 12"
          field="device"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
      {contextAction === 'setViewportSize' && (
        <>
          {renderPropertyRow('viewportWidth', (
            <InlineNumberInput
              label="Viewport Width"
              value={renderData.viewportWidth || 1920}
              onChange={(value) => handlePropertyChange('viewportWidth', value)}
              placeholder="1920"
              field="viewportWidth"
              onOpenPopup={handleOpenPopup}
            />
          ), 4)}
          {renderPropertyRow('viewportHeight', (
            <InlineNumberInput
              label="Viewport Height"
              value={renderData.viewportHeight || 1080}
              onChange={(value) => handlePropertyChange('viewportHeight', value)}
              placeholder="1080"
              field="viewportHeight"
              onOpenPopup={handleOpenPopup}
            />
          ), 5)}
        </>
      )}
      {contextAction === 'setUserAgent' && renderPropertyRow('userAgent', (
        <InlineTextInput
          label="User Agent"
          value={renderData.userAgent || ''}
          onChange={(value) => handlePropertyChange('userAgent', value)}
          placeholder="Mozilla/5.0..."
          field="userAgent"
          onOpenPopup={handleOpenPopup}
        />
      ), 6)}
      {contextAction === 'setLocale' && renderPropertyRow('locale', (
        <InlineTextInput
          label="Locale"
          value={renderData.locale || ''}
          onChange={(value) => handlePropertyChange('locale', value)}
          placeholder="en-US"
          field="locale"
          onOpenPopup={handleOpenPopup}
        />
      ), 7)}
      {contextAction === 'setTimezone' && renderPropertyRow('timezoneId', (
        <InlineTextInput
          label="Timezone ID"
          value={renderData.timezoneId || ''}
          onChange={(value) => handlePropertyChange('timezoneId', value)}
          placeholder="America/New_York"
          field="timezoneId"
          onOpenPopup={handleOpenPopup}
        />
      ), 8)}
      {contextAction === 'setColorScheme' && renderPropertyRow('colorScheme', (
        <InlineSelect
          label="Color Scheme"
          value={renderData.colorScheme || 'light'}
          onChange={(value) => handlePropertyChange('colorScheme', value)}
          options={[
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'No Preference', value: 'no-preference' },
          ]}
        />
      ), 9)}
      {contextAction === 'setGeolocation' && (
        <>
          {renderPropertyRow('geolocation.latitude', (
            <InlineNumberInput
              label="Latitude"
              value={(renderData.geolocation as any)?.latitude || 0}
              onChange={(value) => {
                const current = (renderData.geolocation as any) || {};
                handlePropertyChange('geolocation', { ...current, latitude: value });
              }}
              placeholder="40.7128"
              field="latitude"
              onOpenPopup={handleOpenPopup}
            />
          ), 10)}
          {renderPropertyRow('geolocation.longitude', (
            <InlineNumberInput
              label="Longitude"
              value={(renderData.geolocation as any)?.longitude || 0}
              onChange={(value) => {
                const current = (renderData.geolocation as any) || {};
                handlePropertyChange('geolocation', { ...current, longitude: value });
              }}
              placeholder="-74.0060"
              field="longitude"
              onOpenPopup={handleOpenPopup}
            />
          ), 11)}
        </>
      )}
      {contextAction === 'setPermissions' && renderPropertyRow('permissions', (
        <InlineTextInput
          label="Permissions"
          value={Array.isArray(renderData.permissions) ? (renderData.permissions as string[]).join(', ') : ''}
          onChange={(value) => {
            const perms = value.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
            handlePropertyChange('permissions', perms);
          }}
          placeholder="geolocation, notifications, camera"
          field="permissions"
          onOpenPopup={handleOpenPopup}
        />
      ), 12)}
      {contextAction === 'setExtraHTTPHeaders' && renderPropertyRow('extraHTTPHeaders', (
        <InlineTextarea
          label="HTTP Headers (JSON)"
          value={JSON.stringify(renderData.extraHTTPHeaders || {}, null, 2)}
          onChange={(value) => {
            try {
              const parsed = JSON.parse(value);
              handlePropertyChange('extraHTTPHeaders', parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='{"Authorization": "Bearer token"}'
          field="extraHTTPHeaders"
          onOpenPopup={(_type, label, value, onChange, placeholder, min, max, field) => {
            handleOpenPopup('code', label, value, onChange, placeholder, min, max, field);
          }}
        />
      ), 13)}
      {contextAction === 'addInitScript' && renderPropertyRow('initScript', (
        <InlineTextarea
          label="Init Script"
          value={renderData.initScript || ''}
          onChange={(value) => handlePropertyChange('initScript', value)}
          placeholder="// JavaScript code"
          field="initScript"
          onOpenPopup={(_type, label, value, onChange, placeholder, min, max, field) => {
            handleOpenPopup('code', label, value, onChange, placeholder, min, max, field);
          }}
        />
      ), 14)}
    </div>
  );
};
