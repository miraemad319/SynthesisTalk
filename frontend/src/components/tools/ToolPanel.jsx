// src/components/tools/ToolPanel.jsx

import React from 'react';
import { 
  Card, 
  Switch, 
  Typography, 
  Space, 
  Divider, 
  Tooltip,
  Badge,
  Button
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ToolPanel = ({ tools, onToolChange, onSummarize }) => {
  const handleToolToggle = (toolName, value) => {
    console.log(`Tool toggle: ${toolName} = ${value}`); // Debug log
    if (onToolChange) {
      onToolChange(toolName, value);
    }
  };

  const activeToolsCount = Object.values(tools || {}).filter(Boolean).length;

  // Debug: Log current tools state
  console.log('ToolPanel - Current tools state:', tools);
  console.log('ToolPanel - onToolChange function:', onToolChange);

  return (
    <div 
      style={{ 
        width: 320, 
        height: '100%', 
        borderLeft: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden' // Prevent panel overflow
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: '20px 20px 16px 20px',
        backgroundColor: '#fafafa',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0 // Prevent header from shrinking
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <SettingOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
          <Title level={4} style={{ margin: 0, color: '#1f1f1f', fontWeight: 600 }}>
            AI Tools
          </Title>
          {activeToolsCount > 0 && (
            <Badge 
              count={activeToolsCount} 
              style={{ backgroundColor: '#52c41a' }}
            />
          )}
        </div>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Configure AI capabilities for your chat
        </Text>
      </div>

      {/* FIXED: Scrollable content area */}
      <div style={{ 
        flex: 1, 
        padding: '16px 20px 0 20px', 
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0, // Important for flex child to be scrollable
        scrollBehavior: 'smooth'
      }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Web Search Tool */}
          <Card 
            size="small" 
            style={{ 
              borderRadius: '8px',
              border: tools?.webSearch ? '2px solid #52c41a' : '1px solid #f0f0f0',
              backgroundColor: tools?.webSearch ? '#f6ffed' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handleToolToggle('webSearch', !tools?.webSearch)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <SearchOutlined 
                    style={{ 
                      color: tools?.webSearch ? '#52c41a' : '#1890ff',
                      fontSize: '16px'
                    }} 
                  />
                  <Text strong style={{ color: tools?.webSearch ? '#52c41a' : '#1f1f1f' }}>
                    Web Search
                  </Text>
                  <Tooltip title="AI will search the internet for current information">
                    <InfoCircleOutlined style={{ color: '#d9d9d9', fontSize: '12px' }} />
                  </Tooltip>
                </div>
                <Text type="secondary" style={{ fontSize: '12px', lineHeight: '16px' }}>
                  Search the web for latest information, news, and real-time data
                </Text>
              </div>
              <Switch
                checked={tools?.webSearch || false}
                onChange={(checked) => {
                  console.log(`Switch clicked: webSearch = ${checked}`);
                  handleToolToggle('webSearch', checked);
                }}
                size="small"
                onClick={(checked, e) => {
                  e.stopPropagation(); // Prevent card click
                }}
              />
            </div>
          </Card>

          {/* Document Search Tool */}
          <Card 
            size="small" 
            style={{ 
              borderRadius: '8px',
              border: tools?.documentSearch ? '2px solid #1890ff' : '1px solid #f0f0f0',
              backgroundColor: tools?.documentSearch ? '#f0f9ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handleToolToggle('documentSearch', !tools?.documentSearch)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileTextOutlined 
                    style={{ 
                      color: tools?.documentSearch ? '#1890ff' : '#1890ff',
                      fontSize: '16px'
                    }} 
                  />
                  <Text strong style={{ color: tools?.documentSearch ? '#1890ff' : '#1f1f1f' }}>
                    Document Search
                  </Text>
                  <Tooltip title="AI will search through your uploaded documents">
                    <InfoCircleOutlined style={{ color: '#d9d9d9', fontSize: '12px' }} />
                  </Tooltip>
                </div>
                <Text type="secondary" style={{ fontSize: '12px', lineHeight: '16px' }}>
                  Search through uploaded PDFs, documents, and files
                </Text>
              </div>
              <Switch
                checked={tools?.documentSearch || false}
                onChange={(checked) => {
                  console.log(`Switch clicked: documentSearch = ${checked}`);
                  handleToolToggle('documentSearch', checked);
                }}
                size="small"
                onClick={(checked, e) => {
                  e.stopPropagation(); // Prevent card click
                }}
              />
            </div>
          </Card>

          {/* Chain of Thought Tool */}
          <Card 
            size="small" 
            style={{ 
              borderRadius: '8px',
              border: tools?.chainOfThought ? '2px solid #722ed1' : '1px solid #f0f0f0',
              backgroundColor: tools?.chainOfThought ? '#f9f0ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handleToolToggle('chainOfThought', !tools?.chainOfThought)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ThunderboltOutlined 
                    style={{ 
                      color: tools?.chainOfThought ? '#722ed1' : '#722ed1',
                      fontSize: '16px'
                    }} 
                  />
                  <Text strong style={{ color: tools?.chainOfThought ? '#722ed1' : '#1f1f1f' }}>
                    Chain of Thought
                  </Text>
                  <Tooltip title="AI will show its reasoning process step by step">
                    <InfoCircleOutlined style={{ color: '#d9d9d9', fontSize: '12px' }} />
                  </Tooltip>
                </div>
                <Text type="secondary" style={{ fontSize: '12px', lineHeight: '16px' }}>
                  See the AI's reasoning process and thought steps
                </Text>
              </div>
              <Switch
                checked={tools?.chainOfThought || false}
                onChange={(checked) => {
                  console.log(`Switch clicked: chainOfThought = ${checked}`);
                  handleToolToggle('chainOfThought', checked);
                }}
                size="small"
                onClick={(checked, e) => {
                  e.stopPropagation(); // Prevent card click
                }}
              />
            </div>
          </Card>

          {/* Insights Tool */}
          <Card 
            size="small" 
            style={{ 
              borderRadius: '8px',
              border: tools?.insights ? '2px solid #fa8c16' : '1px solid #f0f0f0',
              backgroundColor: tools?.insights ? '#fff7e6' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handleToolToggle('insights', !tools?.insights)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <BulbOutlined 
                    style={{ 
                      color: tools?.insights ? '#fa8c16' : '#fa8c16',
                      fontSize: '16px'
                    }} 
                  />
                  <Text strong style={{ color: tools?.insights ? '#fa8c16' : '#1f1f1f' }}>
                    AI Insights
                  </Text>
                  <Tooltip title="Generate analytical insights and patterns from conversations">
                    <InfoCircleOutlined style={{ color: '#d9d9d9', fontSize: '12px' }} />
                  </Tooltip>
                </div>
                <Text type="secondary" style={{ fontSize: '12px', lineHeight: '16px' }}>
                  Generate insights, patterns, and analytical summaries
                </Text>
              </div>
              <Switch
                checked={tools?.insights || false}
                onChange={(checked) => {
                  console.log(`Switch clicked: insights = ${checked}`);
                  handleToolToggle('insights', checked);
                }}
                size="small"
                onClick={(checked, e) => {
                  e.stopPropagation(); // Prevent card click
                }}
              />
            </div>
          </Card>

          <Divider style={{ margin: '16px 0' }} />

          {/* Quick Actions */}
          <div>
            <Title level={5} style={{ margin: '0 0 12px 0', color: '#1f1f1f' }}>
              Quick Actions
            </Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button
                block
                onClick={() => {
                  console.log('Summarize button clicked');
                  if (onSummarize) {
                    onSummarize();
                  }
                }}
                disabled={!onSummarize}
                style={{
                  borderRadius: '6px',
                  height: '36px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '8px'
                }}
                icon={<BulbOutlined />}
              >
                Summarize Conversation
              </Button>
            </Space>
          </div>

          {/* Tool Status Summary */}
          {activeToolsCount > 0 && (
            <Card 
              size="small" 
              style={{ 
                backgroundColor: '#f0f9ff', 
                border: '1px solid #e6f7ff',
                borderRadius: '8px'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
                  {activeToolsCount} Tool{activeToolsCount !== 1 ? 's' : ''} Active
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  AI capabilities are enhanced
                </Text>
              </div>
            </Card>
          )}

          {/* Debug Information - Remove in production */}
          <Card 
            size="small" 
            style={{ 
              backgroundColor: '#fff2e8', 
              border: '1px solid #ffd591',
              borderRadius: '6px'
            }}
          >
            <Text strong style={{ fontSize: '11px', color: '#fa8c16', display: 'block' }}>
              Debug Info:
            </Text>
            <div style={{ fontSize: '10px', color: '#8c4a1a', marginTop: '4px' }}>
              <div>Web Search: {tools?.webSearch ? 'ON' : 'OFF'}</div>
              <div>Document Search: {tools?.documentSearch ? 'ON' : 'OFF'}</div>
              <div>Chain of Thought: {tools?.chainOfThought ? 'ON' : 'OFF'}</div>
              <div>Insights: {tools?.insights ? 'ON' : 'OFF'}</div>
              <div>Active Count: {activeToolsCount}</div>
              <div>onToolChange: {onToolChange ? 'Available' : 'Missing'}</div>
            </div>
          </Card>
        </Space>
      </div>

      {/* Bottom tips section */}
      <div style={{ 
        padding: '16px 20px 20px 20px',
        backgroundColor: '#fafafa',
        borderTop: '1px solid #f0f0f0',
        flexShrink: 0 // Prevent footer from shrinking
      }}>
        <Card 
          size="small" 
          style={{ 
            backgroundColor: '#f6ffed', 
            border: '1px solid #d9f7be',
            borderRadius: '6px'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ color: '#52c41a', fontSize: '12px' }}>
              💡 Pro Tip
            </Text>
            <br />
            <Text style={{ fontSize: '11px', color: '#389e0d', lineHeight: '14px' }}>
              Enable multiple tools for the most comprehensive AI assistance
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ToolPanel;