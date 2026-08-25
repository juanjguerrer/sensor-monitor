import { createLoaders } from './loaders';
import { NotFoundError } from '../db/errors';
import * as repository from '../db/repository';
import type { Location } from '../db/types';

jest.mock('../db/repository');

const repo = jest.mocked(repository);

function location(id: number): Location {
  return { id, name: `Location ${id}`, plantId: 1, description: null };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('batching', () => {
  it('collapses several loads in one tick into a single query', async () => {
    repo.listLocationsByIds.mockResolvedValue([location(1), location(2), location(3)]);

    const loaders = createLoaders();
    await Promise.all([
      loaders.location.load(1),
      loaders.location.load(2),
      loaders.location.load(3),
    ]);

    expect(repo.listLocationsByIds).toHaveBeenCalledTimes(1);
    expect(repo.listLocationsByIds).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('deduplicates repeated ids within a batch', async () => {
    // The N+1 case in practice: many sensors share one location, so the same
    // id is requested many times in a single request.
    repo.listLocationsByIds.mockResolvedValue([location(1)]);

    const loaders = createLoaders();
    await Promise.all([
      loaders.location.load(1),
      loaders.location.load(1),
      loaders.location.load(1),
    ]);

    expect(repo.listLocationsByIds).toHaveBeenCalledTimes(1);
    expect(repo.listLocationsByIds).toHaveBeenCalledWith([1]);
  });

  it('serves a repeat load from cache without querying again', async () => {
    repo.listLocationsByIds.mockResolvedValue([location(1)]);

    const loaders = createLoaders();
    await loaders.location.load(1);
    await loaders.location.load(1);

    expect(repo.listLocationsByIds).toHaveBeenCalledTimes(1);
  });

  it('does not share a cache between two loaders', async () => {
    repo.listLocationsByIds.mockResolvedValue([location(1)]);

    await createLoaders().location.load(1);
    await createLoaders().location.load(1);

    expect(repo.listLocationsByIds).toHaveBeenCalledTimes(2);
  });
});

describe('ordering', () => {
  it('returns each key its own row regardless of the order rows come back', async () => {
    // Postgres makes no ordering promise for `WHERE id = ANY(...)`. If the
    // loader passed rows straight through, key 3 would receive row 1 here —
    // same array length, so nothing would complain, and the data would be
    // silently wrong.
    repo.listLocationsByIds.mockResolvedValue([location(1), location(2), location(3)]);

    const loaders = createLoaders();
    const [third, first, second] = await Promise.all([
      loaders.location.load(3),
      loaders.location.load(1),
      loaders.location.load(2),
    ]);

    expect(third.id).toBe(3);
    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });
});

describe('missing ids', () => {
  it('rejects the missing key with NotFoundError', async () => {
    repo.listLocationsByIds.mockResolvedValue([location(1)]);

    const loaders = createLoaders();

    await expect(loaders.location.load(99)).rejects.toThrow(NotFoundError);
  });

  it('rejects only the missing key, leaving its neighbours resolved', async () => {
    // A row that disappeared must not take the whole batch down with it.
    repo.listLocationsByIds.mockResolvedValue([location(1), location(3)]);

    const loaders = createLoaders();
    const results = await Promise.allSettled([
      loaders.location.load(1),
      loaders.location.load(2),
      loaders.location.load(3),
    ]);

    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
    expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(NotFoundError);
  });

  it('names the entity and id in the error, so formatError can map it', async () => {
    repo.listLocationsByIds.mockResolvedValue([]);

    const loaders = createLoaders();

    await expect(loaders.location.load(42)).rejects.toMatchObject({
      entity: 'Location',
      id: 42,
    });
  });
});
