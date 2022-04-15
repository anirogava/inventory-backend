import { count } from "console";
import { Inventory } from "../models/Inventory";

export interface InventoryRepository {
  getList(
    offset: number,
    limit: number,
    count: number
  ): Promise<Inventory[] | null>;
}
export class InventoryRepository implements InventoryRepository {
  getList(offset: number = 0, limit: number = 10): Promise<Inventory[] | null> {
    return Inventory.findAll({
      offset,
      limit,
    });
  }
}
