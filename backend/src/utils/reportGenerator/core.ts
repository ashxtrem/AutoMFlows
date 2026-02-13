import * as fs from 'fs';
import * as path from 'path';
import { ReportType, Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { generateHTMLReport } from './html';
import { generateJSONReport } from './json';
import { generateJUnitReport } from './junit';
import { generateCSVReport } from './csv';
import { generateMarkdownReport } from './markdown';
import { generateAllureReport } from './allure';

/**
 * Main report generator class that orchestrates report generation
 */
export class ReportGenerator {
  private metadata: ExecutionMetadata;
  private outputDirectory: string;
  private workflow: Workflow;

  constructor(metadata: ExecutionMetadata, workflow: Workflow) {
    this.metadata = metadata;
    this.outputDirectory = metadata.outputDirectory;
    this.workflow = workflow;
  }

  async generateReports(reportTypes: ReportType[]): Promise<void> {
    for (const reportType of reportTypes) {
      const reportDir = path.join(this.outputDirectory, reportType);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      try {
        switch (reportType) {
          case 'html':
            await generateHTMLReport(this.metadata, this.workflow, reportDir);
            break;
          case 'json':
            await generateJSONReport(this.metadata, this.workflow, reportDir);
            break;
          case 'junit':
            await generateJUnitReport(this.metadata, this.workflow, reportDir);
            break;
          case 'csv':
            await generateCSVReport(this.metadata, this.workflow, reportDir);
            break;
          case 'markdown':
            await generateMarkdownReport(this.metadata, this.workflow, reportDir);
            break;
          case 'allure':
            await generateAllureReport(this.metadata, this.workflow, reportDir);
            break;
        }
      } catch (error: any) {
        console.error(`Failed to generate ${reportType} report:`, error);
        // Don't throw - continue with other report types
      }
    }
  }
}
