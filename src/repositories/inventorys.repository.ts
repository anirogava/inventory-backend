import { Inventory } from "../models/Inventory";

export interface InventoryRepository {
  getList(
    offset: number,
    limit: number,
    filters: {
      [key: string]: string;
    }
  ): Promise<Inventory[] | null>;
}
export class InventoryRepository implements InventoryRepository {
  getList(
    offset: number = 0,
    limit: number = 10,
    filters: {
      [key: string]: string;
    }
  ): Promise<Inventory[] | null> {
    let where = {};
    if (filters.userId) {
      where = {
        userId: filters.userId,
      };
    }
    return Inventory.findAll({
      offset,
      limit,
      where,
    });
  }
}
