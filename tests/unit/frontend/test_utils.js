/**
 * @jest-environment jsdom
 */

// 模拟前端工具函数
const utils = {
  formatChatMessage: (messageText) => {
    const regex = /\[(\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2})\] ([^:]+): (.+)/;
    const match = messageText.match(regex);
    
    if (match) {
      return {
        timestamp: match[1],
        sender: match[2],
        message: match[3]
      };
    }
    return null;
  },
  
  validateApiKey: (apiKey) => {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    return apiKey.length > 10 && apiKey.startsWith('sk-');
  },
  
  sanitizeFileName: (fileName) => {
    return fileName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
  },
  
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

describe('Utils Functions', () => {
  describe('formatChatMessage', () => {
    test('should format valid chat message correctly', () => {
      const input = '[2024/2/1 14:30:00] 用户A: 测试消息';
      const expected = {
        timestamp: '2024/2/1 14:30:00',
        sender: '用户A',
        message: '测试消息'
      };
      expect(utils.formatChatMessage(input)).toEqual(expected);
    });
    
    test('should handle complex message content', () => {
      const input = '[2024/2/1 14:30:00] 产品经理小陈: 关于用户反馈的几个优化建议，我们来讨论一下';
      const result = utils.formatChatMessage(input);
      expect(result.sender).toBe('产品经理小陈');
      expect(result.message).toBe('关于用户反馈的几个优化建议，我们来讨论一下');
    });
    
    test('should return null for invalid format', () => {
      const input = '无效格式的消息';
      expect(utils.formatChatMessage(input)).toBeNull();
    });
    
    test('should handle empty string', () => {
      expect(utils.formatChatMessage('')).toBeNull();
    });
  });
  
  describe('validateApiKey', () => {
    test('should validate correct API key format', () => {
      const validKey = 'sk-abcd1234567890';
      expect(utils.validateApiKey(validKey)).toBe(true);
    });
    
    test('should reject invalid API key formats', () => {
      expect(utils.validateApiKey('')).toBe(false);
      expect(utils.validateApiKey('invalid')).toBe(false);
      expect(utils.validateApiKey('sk-123')).toBe(false);
      expect(utils.validateApiKey(null)).toBe(false);
      expect(utils.validateApiKey(undefined)).toBe(false);
    });
  });
  
  describe('sanitizeFileName', () => {
    test('should sanitize file name correctly', () => {
      expect(utils.sanitizeFileName('测试文件.txt')).toBe('测试文件.txt');
      expect(utils.sanitizeFileName('file with spaces.txt')).toBe('file_with_spaces.txt');
      expect(utils.sanitizeFileName('file/with\\special:chars.txt')).toBe('file_with__special_chars.txt');
    });
  });
  
  describe('formatFileSize', () => {
    test('should format file sizes correctly', () => {
      expect(utils.formatFileSize(0)).toBe('0 Bytes');
      expect(utils.formatFileSize(1024)).toBe('1 KB');
      expect(utils.formatFileSize(1048576)).toBe('1 MB');
      expect(utils.formatFileSize(1073741824)).toBe('1 GB');
    });
  });
});