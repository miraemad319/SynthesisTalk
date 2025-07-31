// src/components/tools/ExportPanel.jsx

import React, { useState } from 'react';
import { Button, Select, message, Spin } from 'antd';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { exportSession } from '../../utils/api';

const { Option } = Select;

export default function ExportPanel({ sessionId, disabled = false }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  const handleExport = async () => {
    if (!sessionId) {
      message.error('No session selected for export');
      return;
    }

    try {
      setIsExporting(true);
      message.info(`Starting ${exportFormat.toUpperCase()} export...`);
      
      await exportSession(sessionId, exportFormat);
      
      message.success(`Session exported successfully as ${exportFormat.toUpperCase()}!`);
    } catch (error) {
      console.error('Export failed:', error);
      message.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-panel space-y-3">
      <div className="text-sm font-medium text-gray-700">📤 Export Session</div>
      
      <div className="space-y-2">
        <Select
          value={exportFormat}
          onChange={setExportFormat}
          className="w-full"
          disabled={disabled || isExporting}
        >
          <Option value="pdf">PDF Document</Option>
          <Option value="txt">Text File</Option>
          <Option value="md">Markdown</Option>
        </Select>

        <Button
          type="primary"
          icon={isExporting ? <LoadingOutlined spin /> : <DownloadOutlined />}
          onClick={handleExport}
          disabled={disabled || isExporting || !sessionId}
          loading={isExporting}
          className="w-full"
        >
          {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        Export the current session's conversation and responses
      </div>
    </div>
  );
}