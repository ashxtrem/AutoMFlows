import { generateReports } from '../reporting';
import { ReportConfig } from '@automflows/shared';
import { ExecutionTracker } from '../../../utils/executionTracker';
import { ReportGenerator } from '../../../utils/reportGenerator';
import { enforceReportRetention } from '../../../utils/reportRetention';

const mockGenerateReports = jest.fn().mockResolvedValue(undefined);
const mockReportGeneratorConstructor = jest.fn().mockImplementation(() => ({
  generateReports: mockGenerateReports,
}));

jest.mock('../../../utils/reportGenerator', () => {
  const mockGenerateReports = jest.fn().mockResolvedValue(undefined);
  const mockReportGeneratorConstructor = jest.fn().mockImplementation(() => ({
    generateReports: mockGenerateReports,
  }));
  return {
    ReportGenerator: mockReportGeneratorConstructor,
  };
});

jest.mock('../../../utils/reportRetention', () => ({
  enforceReportRetention: jest.fn().mockResolvedValue(undefined),
}));

describe('reporting', () => {
  let mockTracker: ExecutionTracker;
  let mockTraceLog: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTraceLog = jest.fn();
    mockTracker = {
      getMetadata: jest.fn().mockReturnValue({}),
      getWorkflow: jest.fn().mockReturnValue({ nodes: [] }),
    } as any;

    (ReportGenerator as jest.Mock).mockImplementation(() => ({
      generateReports: jest.fn().mockResolvedValue(undefined),
    }));
    (enforceReportRetention as jest.Mock).mockResolvedValue(undefined);
  });

  describe('generateReports', () => {
    it('should generate reports if tracker and config provided', async () => {
      const config: ReportConfig = {
        enabled: true,
        reportTypes: ['html', 'json'],
        outputPath: './output',
      };

      await generateReports(mockTracker, config, mockTraceLog);

      expect(ReportGenerator).toHaveBeenCalled();
      expect(mockTraceLog).toHaveBeenCalledWith(
        expect.stringContaining('Generated reports')
      );
    });

    it('should enforce report retention', async () => {
      const config: ReportConfig = {
        enabled: true,
        reportTypes: ['html'],
        outputPath: './output',
        reportRetention: 5,
      };

      await generateReports(mockTracker, config, mockTraceLog);

      expect(enforceReportRetention).toHaveBeenCalledWith(5, './output');
    });

    it('should use default retention count if not specified', async () => {
      const config: ReportConfig = {
        enabled: true,
        reportTypes: ['html'],
        outputPath: './output',
      };

      await generateReports(mockTracker, config, mockTraceLog);

      expect(enforceReportRetention).toHaveBeenCalledWith(10, './output');
    });

    it('should use default output path if not specified', async () => {
      const config: ReportConfig = {
        enabled: true,
        reportTypes: ['html'],
      };

      await generateReports(mockTracker, config, mockTraceLog);

      expect(enforceReportRetention).toHaveBeenCalledWith(10, './output');
    });

    it('should return early if tracker not provided', async () => {
      const config: ReportConfig = {
        enabled: true,
        reportTypes: ['html'],
      };

      await generateReports(undefined, config, mockTraceLog);

      expect(ReportGenerator).not.toHaveBeenCalled();
    });

    it('should return early if config not provided', async () => {
      await generateReports(mockTracker, undefined, mockTraceLog);

      expect(ReportGenerator).not.toHaveBeenCalled();
    });

    it('should return early if reportTypes empty', async () => {
      const config: ReportConfig = {
        enabled: true,
        reportTypes: [],
      };

      await generateReports(mockTracker, config, mockTraceLog);

      expect(ReportGenerator).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const config: ReportConfig = {
        enabled: true,
        reportTypes: ['html'],
      };

      (ReportGenerator as jest.Mock).mockImplementation(() => {
        throw new Error('Report generation failed');
      });

      await expect(
        generateReports(mockTracker, config, mockTraceLog)
      ).resolves.not.toThrow();
    });
  });
});
