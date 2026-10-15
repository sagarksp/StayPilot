import { prisma } from "@/infrastructure/db/prisma";
import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import type { CreatePollInput, MealTypesInput, VoteInput } from "./schemas";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
function localToday(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function localDateAt(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function assertStaff(actor: OrganizationActor, propertyId?: string) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
  if (actor.roles.includes("MANAGER") && !actor.roles.includes("OWNER") && propertyId && !actor.allowedPgIds.includes(propertyId)) throw new AccessDeniedError();
}
function assertManager(actor: OrganizationActor, propertyId?: string) {
  if (!actor.roles.includes("MANAGER") || actor.roles.includes("OWNER")) throw new AccessDeniedError();
  if (propertyId && !actor.allowedPgIds.includes(propertyId)) throw new AccessDeniedError();
}

export const foodUseCases = {
  async listMealTypes(actor: OrganizationActor, propertyPublicId: string) {
    let propertyScopeId: bigint | undefined;
    if (actor.roles.includes("RESIDENT")) {
      const membership = await prisma.organizationMembership.findFirst({ where: { organization: { publicId: actor.organizationId }, user: { publicId: actor.userId }, residentId: { not: null }, status: "ACTIVE" }, select: { residentId: true } });
      if (!membership?.residentId) throw new AccessDeniedError();
      const today = day(localToday(actor.organizationTimezone));
      const stay = await prisma.residentStay.findFirst({ where: { organization: { publicId: actor.organizationId }, residentId: membership.residentId, property: { publicId: propertyPublicId }, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { propertyId: true } });
      if (!stay) throw new AccessDeniedError();
      propertyScopeId = stay.propertyId;
    } else {
      assertStaff(actor, propertyPublicId);
    }
    const property = await prisma.property.findFirst({ where: { publicId: propertyPublicId, organization: { publicId: actor.organizationId }, ...(propertyScopeId ? { id: propertyScopeId } : {}) }, select: { id: true, organizationId: true } });
    if (!property) throw new AccessDeniedError();
    return prisma.foodMealType.findMany({ where: { organizationId: property.organizationId, propertyId: property.id, status: "ACTIVE" }, select: { publicId: true, name: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
  },

  async listManagerPolls(actor: OrganizationActor, propertyPublicId: string) {
    assertManager(actor, propertyPublicId);
    const property = await prisma.property.findFirst({ where: { publicId: propertyPublicId, organization: { publicId: actor.organizationId }, status: "ACTIVE" }, select: { id: true } });
    if (!property) throw new AccessDeniedError();
    return prisma.foodPoll.findMany({ where: { organization: { publicId: actor.organizationId }, propertyId: property.id }, select: { publicId: true, mealDate: true, opensAt: true, closesAt: true, status: true, mealType: { select: { name: true } }, options: { select: { publicId: true, label: true, displayOrder: true, _count: { select: { votes: true } } }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] } }, orderBy: [{ mealDate: "desc" }, { createdAt: "desc" }] });
  },

  async getStaffPage(actor: OrganizationActor) {
    assertStaff(actor);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const properties = await prisma.property.findMany({ where: { organizationId: organization.id, status: "ACTIVE", ...(actor.roles.includes("OWNER") ? {} : { publicId: { in: [...actor.allowedPgIds] } }) }, select: { id: true, publicId: true, name: true }, orderBy: { name: "asc" } });
    if (!properties.length) return { properties, mealTypes: [], polls: [], canSeePollResults: false };
    const ids = properties.map((property) => property.id);
    const [mealTypes, polls] = await Promise.all([
      prisma.foodMealType.findMany({ where: { organizationId: organization.id, propertyId: { in: ids }, status: "ACTIVE" }, select: { publicId: true, propertyId: true, property: { select: { name: true, publicId: true } }, name: true, displayOrder: true }, orderBy: [{ property: { name: "asc" } }, { displayOrder: "asc" }, { id: "asc" }] }),
      actor.roles.includes("MANAGER") && !actor.roles.includes("OWNER") ? prisma.foodPoll.findMany({ where: { organizationId: organization.id, propertyId: { in: ids } }, select: { publicId: true, propertyId: true, property: { select: { name: true } }, mealDate: true, opensAt: true, closesAt: true, status: true, mealType: { select: { name: true } }, options: { select: { publicId: true, label: true, displayOrder: true, _count: { select: { votes: true } } }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] } }, orderBy: [{ mealDate: "desc" }, { createdAt: "desc" }], take: 60 }) : Promise.resolve([]),
    ]);
    return { properties, mealTypes, polls, canSeePollResults: actor.roles.includes("MANAGER") && !actor.roles.includes("OWNER") };
  },

  async replaceMealTypes(actor: OrganizationActor, input: MealTypesInput) {
    assertStaff(actor, input.propertyId);
    const names = input.mealTypes.map((name) => name.trim());
    if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) throw new Error("DUPLICATE_MEAL_TYPE");
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const property = await prisma.property.findFirst({ where: { publicId: input.propertyId, organizationId: organization.id, status: "ACTIVE" }, select: { id: true } });
    if (!property) throw new AccessDeniedError();
    return prisma.$transaction(async (tx) => {
      await tx.foodMealType.updateMany({ where: { organizationId: organization.id, propertyId: property.id, status: "ACTIVE", ...(names.length ? { name: { notIn: names } } : {}) }, data: { status: "INACTIVE" } });
      for (const [displayOrder, name] of names.entries()) {
        await tx.foodMealType.upsert({
          where: { propertyId_name: { propertyId: property.id, name } },
          create: { organizationId: organization.id, propertyId: property.id, name, displayOrder, status: "ACTIVE" },
          update: { displayOrder, status: "ACTIVE" },
        });
      }
    });
  },

  async createPoll(actor: OrganizationActor, input: CreatePollInput) {
    assertManager(actor, input.propertyId);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const property = await prisma.property.findFirst({ where: { publicId: input.propertyId, organizationId: organization.id, status: "ACTIVE" }, select: { id: true } });
    if (!property) throw new AccessDeniedError();
    const today = localToday(actor.organizationTimezone);
    const tomorrowDate = day(today);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);
    const closesAt = new Date(input.closesAt);
    if (input.mealDate < tomorrow || closesAt <= new Date() || localDateAt(closesAt, actor.organizationTimezone) >= input.mealDate) throw new Error("INVALID_POLL_TIME");
    const configuredMealType = await prisma.foodMealType.findFirst({ where: { publicId: input.mealTypeId, organizationId: organization.id, propertyId: property.id, status: "ACTIVE" }, select: { id: true } });
    if (!configuredMealType) throw new Error("INVALID_MEAL_TYPE");
    const user = await prisma.user.findUniqueOrThrow({ where: { publicId: actor.userId }, select: { id: true } });
    try {
      return await prisma.foodPoll.create({ data: { organizationId: organization.id, propertyId: property.id, mealTypeId: configuredMealType.id, mealDate: day(input.mealDate), opensAt: new Date(), closesAt, createdById: user.id, options: { create: input.options.map((label, displayOrder) => ({ label, displayOrder })) } } });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("FOOD_POLL_ALREADY_EXISTS");
      throw error;
    }
  },

  async closePoll(actor: OrganizationActor, pollPublicId: string) {
    assertManager(actor);
    const poll = await prisma.foodPoll.findFirst({ where: { publicId: pollPublicId, organization: { publicId: actor.organizationId }, property: { publicId: { in: [...actor.allowedPgIds] } }, status: "OPEN" }, select: { id: true } });
    if (!poll) throw new Error("FOOD_POLL_NOT_OPEN");
    await prisma.foodPoll.updateMany({ where: { id: poll.id, status: "OPEN" }, data: { status: "CLOSED" } });
  },

  async listForResident(actor: OrganizationActor) {
    if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
    const membership = await prisma.organizationMembership.findFirst({ where: { organization: { publicId: actor.organizationId }, status: "ACTIVE", user: { publicId: actor.userId }, residentId: { not: null }, roles: { some: { roleCode: "RESIDENT" } } }, select: { residentId: true } });
    if (!membership?.residentId) return [];
    const today = day(localToday(actor.organizationTimezone));
    const stay = await prisma.residentStay.findFirst({ where: { organization: { publicId: actor.organizationId }, residentId: membership.residentId, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { id: true, propertyId: true, startDate: true, endDate: true, property: { select: { name: true } } }, orderBy: { startDate: "desc" } });
    if (!stay) return [];
    const polls = await prisma.foodPoll.findMany({ where: { organization: { publicId: actor.organizationId }, propertyId: stay.propertyId, status: "OPEN", mealDate: { gte: today, ...(stay.endDate ? { lte: stay.endDate } : {}) }, closesAt: { gt: new Date() } }, select: { publicId: true, mealDate: true, opensAt: true, closesAt: true, property: { select: { name: true } }, mealType: { select: { name: true } }, options: { select: { publicId: true, label: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }, votes: { where: { residentStayId: stay.id }, select: { option: { select: { publicId: true } } } } }, orderBy: [{ mealDate: "asc" }, { mealType: { displayOrder: "asc" } }] });
    return polls.filter((poll) => poll.opensAt <= new Date()).map((poll) => ({ ...poll, selectedOptionId: poll.votes[0]?.option.publicId ?? "" }));
  },

  async vote(actor: OrganizationActor, input: VoteInput) {
    if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
    const membership = await prisma.organizationMembership.findFirst({ where: { organization: { publicId: actor.organizationId }, status: "ACTIVE", user: { publicId: actor.userId }, residentId: { not: null }, roles: { some: { roleCode: "RESIDENT" } } }, select: { residentId: true } });
    if (!membership?.residentId) throw new AccessDeniedError();
    const today = day(localToday(actor.organizationTimezone));
    const stay = await prisma.residentStay.findFirst({ where: { organization: { publicId: actor.organizationId }, residentId: membership.residentId, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { id: true, propertyId: true, endDate: true } });
    if (!stay) throw new AccessDeniedError();
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM food_polls WHERE public_id = ${input.pollId} AND organization_id = ${organization.id} AND status = 'OPEN' AND opens_at <= UTC_TIMESTAMP(3) AND closes_at > UTC_TIMESTAMP(3) FOR UPDATE`;
      if (!locked.length) throw new Error("POLL_CLOSED");
      const poll = await tx.foodPoll.findFirst({ where: { id: locked[0].id, organizationId: organization.id, propertyId: stay.propertyId, mealDate: { gte: today, ...(stay.endDate ? { lte: stay.endDate } : {}) }, options: { some: { publicId: input.optionId } } }, select: { id: true, options: { where: { publicId: input.optionId }, select: { id: true } } } });
      if (!poll || !poll.options.length) throw new Error("INVALID_POLL_OPTION");
      const updated = await tx.foodVote.upsert({ where: { pollId_residentStayId: { pollId: poll.id, residentStayId: stay.id } }, create: { organizationId: organization.id, pollId: poll.id, residentStayId: stay.id, optionId: poll.options[0].id }, update: { optionId: poll.options[0].id, votedAt: new Date() } });
      return updated;
    });
    return result;
  },
};
