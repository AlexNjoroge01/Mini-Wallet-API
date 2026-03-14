import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error && error.name === 'ZodError') {
        const issues = error.issues || error.errors || [];
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issues.map((e: any) => e.message).join(', ')
          }
        });
        return;
      }
      next(error);
    }
  };
};

