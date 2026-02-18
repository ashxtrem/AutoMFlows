import * as fs from 'fs';
import * as path from 'path';
import { ReportGenerator } from '../core';
import { generateHTMLReport } from '../html';
import { generateJSONReport } from '../json';
import { generateJUnitReport } from '../junit';
import { generateCSVReport } from '../csv';
import { generateMarkdownReport } from '../markdown';
import { generateAllureReport } from '../allure';
import { ExecutionMetadata } from '../../executionTracker';
import { Workflow } from '@automflows/shared';

jest.mock('fs');
jest.mock('../html');
jest.mock('../json');
jest.mock('../junit');
jest.mock('../csv');
jest.mock('../markdown');
jest.mock('../allure');

describe('ReportGenerator', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;
  let generator: ReportGenerator;

  beforeEach(() => {
    metadata = {
      executionId: 'exec1',
      workflowName: 'Test Workflow',
      startTime: 1000,
      endTime: 2000,
      status: 'completed',
      outputDirectory: '/tmp/test-reports',
      screenshotsDirectory: '/tmp/test-reports/screenshots',
      snapshotsDirectory: '/tmp/test-reports/snapshots',
      videosDirectory: '/tmp/test-reports/videos',
      nodes: [],
    };
    workflow = {
      nodes: [],
      edges: [],
    };
    generator = new ReportGenerator(metadata, workflow);

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (generateHTMLReport as jest.Mock).mockResolvedValue(undefined);
    (generateJSONReport as jest.Mock).mockResolvedValue(undefined);
    (generateJUnitReport as jest.Mock).mockResolvedValue(undefined);
    (generateCSVReport as jest.Mock).mockResolvedValue(undefined);
    (generateMarkdownReport as jest.Mock).mockResolvedValue(undefined);
    (generateAllureReport as jest.Mock).mockResolvedValue(undefined);
  });

  it('should create report directories if they do not exist', async () => {
    await generator.generateReports(['html', 'json']);

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join('/tmp/test-reports', 'html'),
      { recursive: true }
    );
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join('/tmp/test-reports', 'json'),
      { recursive: true }
    );
  });

  it('should generate HTML report', async () => {
    await generator.generateReports(['html']);

    expect(generateHTMLReport).toHaveBeenCalledWith(
      metadata,
      workflow,
      path.join('/tmp/test-reports', 'html')
    );
  });

  it('should generate JSON report', async () => {
    await generator.generateReports(['json']);

    expect(generateJSONReport).toHaveBeenCalledWith(
      metadata,
      workflow,
      path.join('/tmp/test-reports', 'json')
    );
  });

  it('should generate JUnit report', async () => {
    await generator.generateReports(['junit']);

    expect(generateJUnitReport).toHaveBeenCalledWith(
      metadata,
      workflow,
      path.join('/tmp/test-reports', 'junit')
    );
  });

  it('should generate CSV report', async () => {
    await generator.generateReports(['csv']);

    expect(generateCSVReport).toHaveBeenCalledWith(
      metadata,
      workflow,
      path.join('/tmp/test-reports', 'csv')
    );
  });

  it('should generate Markdown report', async () => {
    await generator.generateReports(['markdown']);

    expect(generateMarkdownReport).toHaveBeenCalledWith(
      metadata,
      workflow,
      path.join('/tmp/test-reports', 'markdown')
    );
  });

  it('should generate Allure report', async () => {
    await generator.generateReports(['allure']);

    expect(generateAllureReport).toHaveBeenCalledWith(
      metadata,
      workflow,
      path.join('/tmp/test-reports', 'allure')
    );
  });

  it('should generate multiple report types', async () => {
    await generator.generateReports(['html', 'json', 'junit']);

    expect(generateHTMLReport).toHaveBeenCalled();
    expect(generateJSONReport).toHaveBeenCalled();
    expect(generateJUnitReport).toHaveBeenCalled();
  });

  it('should continue with other reports if one fails', async () => {
    (generateHTMLReport as jest.Mock).mockRejectedValue(new Error('HTML generation failed'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await generator.generateReports(['html', 'json']);

    expect(generateHTMLReport).toHaveBeenCalled();
    expect(generateJSONReport).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to generate html report:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
