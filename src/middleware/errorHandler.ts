import type { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err.statusCode === 'number' && typeof err.code === 'string') {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error occurred', stack: err?.stack || err?.message || String(err), errObj: err },
  });
};

