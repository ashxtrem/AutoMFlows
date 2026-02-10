import { InlineTextInput, InlineSelect } from '../../../components/InlinePropertyEditor';
import { PropertyRenderer } from './types';

export const renderDbConnectProperties: PropertyRenderer = ({ renderData, handlePropertyChange, handleOpenPopup, renderPropertyRow }) => {
  return (
    <div className="mt-2 space-y-1">
      {renderPropertyRow('dbType', (
        <InlineSelect
          label="DB Type"
          value={renderData.dbType || 'postgres'}
          onChange={(value) => handlePropertyChange('dbType', value)}
          options={[
            { label: 'PostgreSQL', value: 'postgres' },
            { label: 'MySQL', value: 'mysql' },
            { label: 'MongoDB', value: 'mongodb' },
            { label: 'SQLite', value: 'sqlite' },
          ]}
        />
      ), 0)}
      {renderPropertyRow('connectionKey', (
        <InlineTextInput
          label="Connection Key"
          value={renderData.connectionKey || 'dbConnection'}
          onChange={(value) => handlePropertyChange('connectionKey', value)}
          placeholder="dbConnection"
          onOpenPopup={handleOpenPopup}
        />
      ), 1)}
      {renderData.configKey && renderPropertyRow('configKey', (
        <InlineTextInput
          label="Config Key"
          value={renderData.configKey || ''}
          onChange={(value) => handlePropertyChange('configKey', value)}
          placeholder="dbConfig"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {!renderData.configKey && renderData.host && renderPropertyRow('host', (
        <InlineTextInput
          label="Host"
          value={renderData.host || ''}
          onChange={(value) => handlePropertyChange('host', value)}
          placeholder="localhost"
          onOpenPopup={handleOpenPopup}
        />
      ), 2)}
      {!renderData.configKey && renderData.database && renderPropertyRow('database', (
        <InlineTextInput
          label="Database"
          value={renderData.database || ''}
          onChange={(value) => handlePropertyChange('database', value)}
          placeholder="mydb"
          onOpenPopup={handleOpenPopup}
        />
      ), 3)}
    </div>
  );
};
