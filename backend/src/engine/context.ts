import { ExecutionContext } from '@automflows/shared';

export class ContextManager {
  private context: ExecutionContext;

  constructor() {
    this.context = {
      data: {},
      variables: {},
    };
  }

  setPage(page: any): void {
    this.context.page = page;
  }

  getPage(): any {
    return this.context.page;
  }

  setBrowser(browser: any): void {
    this.context.browser = browser;
  }

  getBrowser(): any {
    return this.context.browser;
  }

  setData(key: string, value: any): void {
    this.context.data[key] = value;
  }

  getData(key: string): any {
    return this.context.data[key];
  }

  getAllData(): Record<string, any> {
    return { ...this.context.data };
  }

  setVariable(key: string, value: any): void {
    this.context.variables[key] = value;
  }

  getVariable(key: string): any {
    return this.context.variables[key];
  }

  getAllVariables(): Record<string, any> {
    return { ...this.context.variables };
  }

  getContext(): ExecutionContext {
    return {
      ...this.context,
      data: { ...this.context.data },
      variables: { ...this.context.variables },
    };
  }

  reset(): void {
    this.context = {
      data: {},
      variables: {},
    };
  }
}

