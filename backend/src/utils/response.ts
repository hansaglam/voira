import type { AnalysisFailedResponse, AnalysisResponse } from '../types/analysis.js';

export function failed(
  errorCode: string,
  messageTr: string,
): AnalysisFailedResponse {
  return { ok: false, errorCode, messageTr };
}

export function sendFailed(res: import('express').Response, status: number, body: AnalysisFailedResponse) {
  return res.status(status).json(body);
}

export function sendSuccess(res: import('express').Response, body: Extract<AnalysisResponse, { ok: true }>) {
  return res.status(200).json(body);
}
