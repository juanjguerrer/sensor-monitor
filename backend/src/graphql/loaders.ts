import DataLoader from "dataloader"
import { listLocationsByIds } from "../db/repository"
import { NotFoundError } from "../db/errors";
import type { Location } from '../db/types';
export function createLoaders() {
  return {
    location: new DataLoader<number, Location>(async (locationIds) => {
      const rows = await listLocationsByIds(locationIds);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return locationIds.map((id) => byId.get(id) ?? new NotFoundError('Location', id))
    })
  }
}