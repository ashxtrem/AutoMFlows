"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
class ContextManager {
    constructor() {
        this.context = {
            data: {},
            variables: {},
        };
    }
    setPage(page) {
        this.context.page = page;
    }
    getPage() {
        return this.context.page;
    }
    setBrowser(browser) {
        this.context.browser = browser;
    }
    getBrowser() {
        return this.context.browser;
    }
    setData(key, value) {
        this.context.data[key] = value;
    }
    getData(key) {
        return this.context.data[key];
    }
    getAllData() {
        return { ...this.context.data };
    }
    setVariable(key, value) {
        this.context.variables[key] = value;
    }
    getVariable(key) {
        return this.context.variables[key];
    }
    getAllVariables() {
        return { ...this.context.variables };
    }
    getContext() {
        return {
            ...this.context,
            data: { ...this.context.data },
            variables: { ...this.context.variables },
        };
    }
    reset() {
        this.context = {
            data: {},
            variables: {},
        };
    }
}
exports.ContextManager = ContextManager;
