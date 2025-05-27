import { ZodError } from 'zod';
import { Socket } from 'socket.io';
import { Logger } from 'pino';

export function socketErrorHandler<Args extends unknown[], Return>(
  socket: Socket,
  logger: Logger,
  handler: (...args: Args) => Return | Promise<Return>,
): (...args: Args) => void {
  const handleError = (err: unknown) => {
    if (err instanceof ZodError) {
      logger.error(err, 'ZodError');
      socket.emit('error', {
        message: err.message,
      });
      return;
    }
    if (err instanceof Error) {
      logger.error({ err }, 'Unexpected error type');
      socket.emit('error', {
        message: 'An unexpected error occurred.',
      });
      return;
    }

    logger.error({ err }, 'Non-Error exception caught');
    socket.emit('error', {
      message: 'An unknown error occurred.',
    });
  };

  return (...args: Args): void => {
    try {
      const result = handler(...args);

      if (
        result instanceof Promise ||
        (typeof result === 'object' &&
          result !== null &&
          'then' in result &&
          typeof (result as unknown as Promise<Return>).then === 'function')
      ) {
        (result as Promise<Return>).catch(handleError);
      }
    } catch (e) {
      handleError(e);
    }
  };
}
