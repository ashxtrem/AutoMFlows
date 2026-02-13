import * as fs from 'fs';
import * as path from 'path';
import { Workflow, StartNodeOverrides } from '@automflows/shared';
import { resolveFromProjectRoot } from './pathUtils';
import { WorkflowFileInfo } from '@automflows/shared';

/**
 * Scans folder for workflow JSON files and validates them
 * Supports recursive scanning and pattern matching
 */
export class WorkflowScanner {
  /**
   * Scan folder for workflow JSON files
   */
  static scanFolder(
    folderPath: string,
    options: {
      recursive?: boolean;
      pattern?: string;
      startNodeOverrides?: StartNodeOverrides;
    } = {}
  ): WorkflowFileInfo[] {
    const { recursive = false, pattern = '*.json', startNodeOverrides } = options;
    
    // Resolve folder path
    const resolvedPath = resolveFromProjectRoot(folderPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Folder not found: ${resolvedPath}`);
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedPath}`);
    }

    const files: WorkflowFileInfo[] = [];
    const filesToScan = this.collectFiles(resolvedPath, recursive, pattern);

    for (const filePath of filesToScan) {
      const result = this.validateAndLoadWorkflow(filePath, resolvedPath, startNodeOverrides);
      files.push(result);
    }

    return files;
  }

  /**
   * Process array of uploaded files
   */
  static processFiles(
    files: Express.Multer.File[],
    startNodeOverrides?: StartNodeOverrides
  ): WorkflowFileInfo[] {
    const results: WorkflowFileInfo[] = [];

    for (const file of files) {
      try {
        // Validate file extension
        if (!file.originalname.toLowerCase().endsWith('.json')) {
          results.push({
            fileName: file.originalname,
            filePath: file.path || file.originalname,
            isValid: false,
            validationErrors: ['File must have .json extension'],
          });
          continue;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          results.push({
            fileName: file.originalname,
            filePath: file.path || file.originalname,
            isValid: false,
            validationErrors: [`File size exceeds maximum allowed size (10MB)`],
          });
          continue;
        }

        // Parse JSON
        let workflow: Workflow;
        try {
          const content = file.buffer.toString('utf-8');
          workflow = JSON.parse(content);
        } catch (parseError: any) {
          results.push({
            fileName: file.originalname,
            filePath: file.path || file.originalname,
            isValid: false,
            validationErrors: [`Invalid JSON: ${parseError.message}`],
          });
          continue;
        }

        // Validate workflow structure
        const validationErrors = this.validateWorkflowStructure(workflow);
        if (validationErrors.length > 0) {
          results.push({
            fileName: file.originalname,
            filePath: file.path || file.originalname,
            isValid: false,
            validationErrors,
            workflow,
          });
          continue;
        }

        // Apply start node overrides if provided
        if (startNodeOverrides) {
          workflow = this.applyStartNodeOverrides(workflow, startNodeOverrides);
        }

        results.push({
          fileName: file.originalname,
          filePath: file.path || file.originalname,
          isValid: true,
          workflow,
        });
      } catch (error: any) {
        results.push({
          fileName: file.originalname,
          filePath: file.path || file.originalname,
          isValid: false,
          validationErrors: [`Error processing file: ${error.message}`],
        });
      }
    }

    return results;
  }

  /**
   * Process array of workflow objects (from workflows array in request)
   */
  static processWorkflows(
    workflows: Workflow[],
    startNodeOverrides?: StartNodeOverrides
  ): WorkflowFileInfo[] {
    const results: WorkflowFileInfo[] = [];

    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      const fileName = `workflow-${i + 1}.json`;

      // Validate workflow structure
      const validationErrors = this.validateWorkflowStructure(workflow);
      if (validationErrors.length > 0) {
        results.push({
          fileName,
          filePath: fileName,
          isValid: false,
          validationErrors,
          workflow,
        });
        continue;
      }

      // Apply start node overrides if provided
      const finalWorkflow = startNodeOverrides
        ? this.applyStartNodeOverrides(workflow, startNodeOverrides)
        : workflow;

      results.push({
        fileName,
        filePath: fileName,
        isValid: true,
        workflow: finalWorkflow,
      });
    }

    return results;
  }

  /**
   * Collect files from folder (recursive if needed)
   */
  private static collectFiles(
    folderPath: string,
    recursive: boolean,
    pattern: string
  ): string[] {
    const files: string[] = [];
    const patternRegex = this.patternToRegex(pattern);

    const scanDirectory = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && recursive) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && patternRegex.test(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(folderPath);
    return files;
  }

  /**
   * Convert glob pattern to regex
   */
  private static patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except * and ?
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${escaped}$`, 'i');
  }

  /**
   * Validate and load workflow from file
   */
  private static validateAndLoadWorkflow(
    filePath: string,
    basePath: string,
    startNodeOverrides?: StartNodeOverrides
  ): WorkflowFileInfo {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(basePath, filePath);

    try {
      // Read file
      const content = fs.readFileSync(filePath, 'utf-8');

      // Parse JSON
      let workflow: Workflow;
      try {
        workflow = JSON.parse(content);
      } catch (parseError: any) {
        return {
          fileName,
          filePath: relativePath,
          isValid: false,
          validationErrors: [`Invalid JSON: ${parseError.message}`],
        };
      }

      // Validate workflow structure
      const validationErrors = this.validateWorkflowStructure(workflow);
      if (validationErrors.length > 0) {
        return {
          fileName,
          filePath: relativePath,
          isValid: false,
          validationErrors,
          workflow,
        };
      }

      // Apply start node overrides if provided
      if (startNodeOverrides) {
        workflow = this.applyStartNodeOverrides(workflow, startNodeOverrides);
      }

      return {
        fileName,
        filePath: relativePath,
        isValid: true,
        workflow,
      };
    } catch (error: any) {
      return {
        fileName,
        filePath: relativePath,
        isValid: false,
        validationErrors: [`Error reading file: ${error.message}`],
      };
    }
  }

  /**
   * Validate workflow structure
   */
  private static validateWorkflowStructure(workflow: any): string[] {
    const errors: string[] = [];

    if (!workflow) {
      errors.push('Workflow is null or undefined');
      return errors;
    }

    if (!Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have a "nodes" property (array)');
    }

    if (!Array.isArray(workflow.edges)) {
      errors.push('Workflow must have an "edges" property (array)');
    }

    if (Array.isArray(workflow.nodes) && workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check for Start node
    if (Array.isArray(workflow.nodes)) {
      const hasStartNode = workflow.nodes.some((node: any) => node.type === 'start');
      if (!hasStartNode) {
        errors.push('Workflow must contain at least one Start node');
      }
    }

    // Optional: Validate node IDs are unique
    if (Array.isArray(workflow.nodes)) {
      const nodeIds = workflow.nodes.map((node: any) => node.id).filter(Boolean);
      const uniqueIds = new Set(nodeIds);
      if (nodeIds.length !== uniqueIds.size) {
        errors.push('Workflow contains duplicate node IDs');
      }
    }

    // Optional: Validate edge references
    if (Array.isArray(workflow.edges) && Array.isArray(workflow.nodes)) {
      const nodeIds = new Set(workflow.nodes.map((node: any) => node.id));
      for (const edge of workflow.edges) {
        if (edge.source && !nodeIds.has(edge.source)) {
          errors.push(`Edge references non-existent source node: ${edge.source}`);
        }
        if (edge.target && !nodeIds.has(edge.target)) {
          errors.push(`Edge references non-existent target node: ${edge.target}`);
        }
      }
    }

    return errors;
  }

  /**
   * Apply start node overrides to workflow
   */
  private static applyStartNodeOverrides(
    workflow: Workflow,
    overrides: StartNodeOverrides
  ): Workflow {
    // Create a copy of the workflow
    const modifiedWorkflow = JSON.parse(JSON.stringify(workflow)) as Workflow;

    // Find Start node
    const startNode = modifiedWorkflow.nodes.find(node => node.type === 'start');
    if (!startNode) {
      return modifiedWorkflow; // No Start node, return as-is
    }

    // Merge overrides into Start node data
    if (startNode.data) {
      startNode.data = {
        ...startNode.data,
        ...overrides,
      };
    } else {
      startNode.data = { ...overrides };
    }

    return modifiedWorkflow;
  }
}
