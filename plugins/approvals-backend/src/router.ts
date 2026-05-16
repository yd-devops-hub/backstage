import {
  InputError,
  NotFoundError,
  NotAllowedError,
  AuthenticationError,
  ConflictError,
} from '@backstage/errors';
import type {
  HttpAuthService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { z } from 'zod/v3';

import {
  ApprovalsService,
  toResponseDto,
  userRefFromCredentials,
} from './services/ApprovalsService';

function httpStatusForError(err: unknown): number {
  if (err instanceof NotFoundError) return 404;
  if (err instanceof InputError) return 400;
  if (err instanceof NotAllowedError) return 403;
  if (err instanceof AuthenticationError) return 401;
  if (err instanceof ConflictError) return 409;
  return 500;
}

const createBodySchema = z.object({
  actionType: z.string().min(1),
  payload: z.unknown(),
});

const commentBodySchema = z
  .object({
    comment: z.string().optional(),
  })
  .optional();

export async function createApprovalsRouter(options: {
  approvals: ApprovalsService;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}): Promise<express.Router> {
  const { approvals, httpAuth, logger } = options;
  const router = Router();
  router.use(express.json());

  router.post('/requests', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, {
        allow: ['user'],
      });
      const body = createBodySchema.parse(req.body);
      const requesterRef = userRefFromCredentials(credentials);
      const row = await approvals.createRequest({
        actionType: body.actionType,
        payload: body.payload as never,
        requesterRef,
        credentials,
      });
      res.status(201).json(toResponseDto(row));
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.message });
        return;
      }
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      if (status === 500) {
        logger.error(message);
      }
      res.status(status).json({ error: message });
    }
  });

  router.get('/requests', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, {
        allow: ['user'],
      });
      const userRef = userRefFromCredentials(credentials);
      const scope = req.query.scope;
      if (scope === 'inbox') {
        const rows = await approvals.listInbox(userRef);
        res.json({ items: rows.map(toResponseDto) });
        return;
      }
      if (scope === 'mine' || scope === undefined) {
        const rows = await approvals.listMine(userRef);
        res.json({ items: rows.map(toResponseDto) });
        return;
      }
      res.status(400).json({ error: `Invalid scope: ${String(scope)}` });
    } catch (err) {
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(status).json({ error: message });
    }
  });

  router.get('/requests/:id', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, {
        allow: ['user'],
      });
      const userRef = userRefFromCredentials(credentials);
      const row = await approvals.getRequestForUser(req.params.id, userRef);
      res.json(toResponseDto(row));
    } catch (err) {
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(status).json({ error: message });
    }
  });

  router.post('/requests/:id/approve', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, {
        allow: ['user'],
      });
      const userRef = userRefFromCredentials(credentials);
      const body = commentBodySchema.parse(req.body);
      const row = await approvals.approve(
        req.params.id,
        userRef,
        body?.comment,
      );
      res.json(toResponseDto(row));
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.message });
        return;
      }
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(status).json({ error: message });
    }
  });

  router.post('/requests/:id/reject', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, {
        allow: ['user'],
      });
      const userRef = userRefFromCredentials(credentials);
      const body = commentBodySchema.parse(req.body);
      const row = await approvals.reject(
        req.params.id,
        userRef,
        body?.comment,
      );
      res.json(toResponseDto(row));
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.message });
        return;
      }
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(status).json({ error: message });
    }
  });

  router.post('/requests/:id/cancel', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, {
        allow: ['user'],
      });
      const userRef = userRefFromCredentials(credentials);
      const row = await approvals.cancel(req.params.id, userRef);
      res.json(toResponseDto(row));
    } catch (err) {
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(status).json({ error: message });
    }
  });

  return router;
}
