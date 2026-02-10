import { ReportConfig } from '@automflows/shared';
import { ExecutionTracker } from '../../utils/executionTracker';
import { ReportGenerator } from '../../utils/reportGenerator';
import { enforceReportRetention } from '../../utils/reportRetention';

/**
 * Generate execution reports
 */
export async function generateReports(
  executionTracker: ExecutionTracker | undefined,
  reportConfig: ReportConfig | undefined,
  traceLog: (message: string) => void
): Promise<void> {
  if (!executionTracker || !reportConfig?.reportTypes.length) {
    return;
  }

  try {
    const metadata = executionTracker.getMetadata();
    const workflow = executionTracker.getWorkflow();
    const reportGenerator = new ReportGenerator(metadata, workflow);
    await reportGenerator.generateReports(reportConfig.reportTypes);
    traceLog(`[TRACE] Generated reports: ${reportConfig.reportTypes.join(', ')}`);
    
    // Enforce report retention after generating reports
    const retentionCount = reportConfig.reportRetention ?? 10;
    const outputPath = reportConfig.outputPath || './output';
    enforceReportRetention(retentionCount, outputPath);
  } catch (error: any) {
    console.error(`Failed to generate reports: ${error.message}`);
    // Don't fail execution if report generation fails
  }
}
