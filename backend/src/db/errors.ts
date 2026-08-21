export class NotFoundError extends Error {
  constructor(public readonly entity: string, public readonly id: number) {
    super(`${entity} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}