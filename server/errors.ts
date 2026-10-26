import type { ScienceError } from '../shared/science.ts';
export class ApiError extends Error {
  code: ScienceError['code'];
  httpStatus: number;
  retryable: boolean;
  diagnostic?: string;
  constructor(code: ScienceError['code'], message: string, httpStatus: number, retryable = false, diagnostic?: string) {
    super(message);
    this.name = 'ApiError'; this.code = code; this.httpStatus = httpStatus;
    this.retryable = retryable; this.diagnostic = diagnostic;
  }
}
