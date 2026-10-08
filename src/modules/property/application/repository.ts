import type {
  BedSummary,
  FloorSummary,
  OrganizationActor,
  PropertySummary,
  RoomSummary,
} from "../domain/inventory";
import type {
  CreateBedInput,
  CreateFloorInput,
  CreatePropertyInput,
  CreateRoomInput,
} from "./schemas";

/** Repository methods must scope every lookup and write to organizationId. */
export interface PropertyRepository {
  listProperties(organizationId: string, propertyIds?: readonly string[]): Promise<PropertySummary[]>;
  getProperty(organizationId: string, propertyId: string): Promise<PropertySummary | null>;
  listFloors(organizationId: string, propertyId: string): Promise<FloorSummary[]>;
  listRooms(organizationId: string, propertyId: string): Promise<RoomSummary[]>;
  listBeds(organizationId: string, propertyId: string): Promise<BedSummary[]>;
  createProperty(organizationId: string, input: CreatePropertyInput): Promise<PropertySummary>;
  createFloor(organizationId: string, propertyId: string, input: CreateFloorInput): Promise<FloorSummary>;
  createRoom(organizationId: string, propertyId: string, input: CreateRoomInput): Promise<RoomSummary>;
  createBed(organizationId: string, propertyId: string, input: CreateBedInput): Promise<BedSummary>;
}

export type PropertyUseCases = Readonly<{
  listProperties(actor: OrganizationActor): Promise<PropertySummary[]>;
  getInventory(actor: OrganizationActor, propertyId: string): Promise<{
    property: PropertySummary;
    floors: FloorSummary[];
    rooms: RoomSummary[];
    beds: BedSummary[];
  } | null>;
  createProperty(actor: OrganizationActor, input: CreatePropertyInput): Promise<PropertySummary>;
  createFloor(actor: OrganizationActor, propertyId: string, input: CreateFloorInput): Promise<FloorSummary>;
  createRoom(actor: OrganizationActor, propertyId: string, input: CreateRoomInput): Promise<RoomSummary>;
  createBed(actor: OrganizationActor, propertyId: string, input: CreateBedInput): Promise<BedSummary>;
}>;
